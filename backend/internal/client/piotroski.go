package client

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/hikmetkutuk/finlenz/backend/internal/model"
)

const (
	timeseriesURL     = "https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries"
	piotroskiTTL      = 24 * time.Hour
	timeseriesPeriod1 = "493590046" // arbitrary far-past unix timestamp, matches Yahoo's own web client
)

// Field names as reported by Yahoo's fundamentals-timeseries API.
const (
	fieldNetIncome     = "annualNetIncome"
	fieldTotalAssets   = "annualTotalAssets"
	fieldOperatingCF   = "annualOperatingCashFlow"
	fieldLongTermDebt  = "annualLongTermDebt"
	fieldCurrentAssets = "annualCurrentAssets"
	fieldCurrentLiab   = "annualCurrentLiabilities"
	fieldSharesOut     = "annualOrdinarySharesNumber"
	fieldGrossProfit   = "annualGrossProfit"
	fieldTotalRevenue  = "annualTotalRevenue"
)

var piotroskiFieldTypes = []string{
	fieldNetIncome, fieldTotalAssets, fieldOperatingCF, fieldLongTermDebt,
	fieldCurrentAssets, fieldCurrentLiab, fieldSharesOut, fieldGrossProfit, fieldTotalRevenue,
}

type piotroskiCacheEntry struct {
	score     *model.PiotroskiScore
	expiresAt time.Time
}

type timeseriesEntry struct {
	AsOfDate      string `json:"asOfDate"`
	ReportedValue struct {
		Raw float64 `json:"raw"`
	} `json:"reportedValue"`
}

type timeseriesMeta struct {
	Type []string `json:"type"`
}

type timeseriesRawResponse struct {
	Timeseries struct {
		Result []map[string]json.RawMessage `json:"result"`
		Error  any                          `json:"error"`
	} `json:"timeseries"`
}

// GetPiotroskiScore computes the 9-point Piotroski F-Score for symbol using
// the two most recent fiscal years of annual financial statement data.
func (c *YahooFinanceClient) GetPiotroskiScore(symbol string) (*model.PiotroskiScore, error) {
	c.piotroskiMu.Lock()
	if entry, ok := c.piotroskiCache[symbol]; ok && time.Now().Before(entry.expiresAt) {
		c.piotroskiMu.Unlock()
		return entry.score, nil
	}
	c.piotroskiMu.Unlock()

	if err := c.initSession(); err != nil {
		return nil, err
	}

	byField, err := c.fetchTimeseries(symbol, piotroskiFieldTypes)
	if err != nil {
		return nil, err
	}

	score, err := computePiotroskiScore(byField)
	if err != nil {
		return nil, err
	}

	c.piotroskiMu.Lock()
	c.piotroskiCache[symbol] = &piotroskiCacheEntry{score: score, expiresAt: time.Now().Add(piotroskiTTL)}
	c.piotroskiMu.Unlock()

	return score, nil
}

func (c *YahooFinanceClient) buildTimeseriesURL(symbol string, types []string) string {
	apiURL, _ := url.Parse(fmt.Sprintf("%s/%s", timeseriesURL, symbol))
	q := apiURL.Query()
	q.Set("symbol", symbol)
	q.Set("type", strings.Join(types, ","))
	q.Set("period1", timeseriesPeriod1)
	q.Set("period2", fmt.Sprintf("%d", time.Now().Unix()+86400))
	q.Set("crumb", c.crumb)
	apiURL.RawQuery = q.Encode()
	return apiURL.String()
}

// doTimeseriesRequest performs the HTTP round-trip and returns the decoded
// response, resetting the cached crumb on auth failures.
func (c *YahooFinanceClient) doTimeseriesRequest(symbol, reqURL string) (*timeseriesRawResponse, error) {
	req, _ := http.NewRequest("GET", reqURL, nil)
	for k, v := range browserHeaders {
		req.Header.Set(k, v)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("timeseries request failed for %s: %w", symbol, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		c.crumbMu.Lock()
		c.crumb = ""
		c.crumbMu.Unlock()
		return nil, fmt.Errorf("authentication error for %s timeseries (status %d)", symbol, resp.StatusCode)
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("yahoo finance timeseries returned status %d for %s: %s", resp.StatusCode, symbol, string(body))
	}

	var raw timeseriesRawResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode timeseries response for %s: %w", symbol, err)
	}
	return &raw, nil
}

// parseTimeseriesResult extracts a single (field name, entries) pair from one
// raw result object, returning ok=false when the entry is malformed or empty.
func parseTimeseriesResult(result map[string]json.RawMessage) (field string, entries []timeseriesEntry, ok bool) {
	metaRaw, found := result["meta"]
	if !found {
		return "", nil, false
	}
	var meta timeseriesMeta
	if err := json.Unmarshal(metaRaw, &meta); err != nil || len(meta.Type) == 0 {
		return "", nil, false
	}

	fieldName := meta.Type[0]
	fieldRaw, found := result[fieldName]
	if !found {
		return "", nil, false
	}

	if err := json.Unmarshal(fieldRaw, &entries); err != nil {
		return "", nil, false
	}
	return fieldName, entries, true
}

func (c *YahooFinanceClient) fetchTimeseries(symbol string, types []string) (map[string][]timeseriesEntry, error) {
	reqURL := c.buildTimeseriesURL(symbol, types)
	raw, err := c.doTimeseriesRequest(symbol, reqURL)
	if err != nil {
		return nil, err
	}

	out := make(map[string][]timeseriesEntry)
	for _, result := range raw.Timeseries.Result {
		field, entries, ok := parseTimeseriesResult(result)
		if !ok {
			continue
		}
		out[field] = entries
	}

	return out, nil
}

// latestTwo returns the two most recent values for a field, assuming entries
// are ordered ascending by date (oldest first, as Yahoo returns them).
func latestTwo(byField map[string][]timeseriesEntry, field string) (curr, prev float64, ok bool) {
	entries, found := byField[field]
	if !found || len(entries) < 2 {
		return 0, 0, false
	}
	n := len(entries)
	return entries[n-1].ReportedValue.Raw, entries[n-2].ReportedValue.Raw, true
}

func computePiotroskiScore(byField map[string][]timeseriesEntry) (*model.PiotroskiScore, error) {
	netIncomeC, netIncomeP, ok1 := latestTwo(byField, fieldNetIncome)
	assetsC, assetsP, ok2 := latestTwo(byField, fieldTotalAssets)
	cfoC, _, ok3 := latestTwo(byField, fieldOperatingCF)
	debtC, debtP, ok4 := latestTwo(byField, fieldLongTermDebt)
	curAssetsC, curAssetsP, ok5 := latestTwo(byField, fieldCurrentAssets)
	curLiabC, curLiabP, ok6 := latestTwo(byField, fieldCurrentLiab)
	sharesC, sharesP, ok7 := latestTwo(byField, fieldSharesOut)
	grossC, grossP, ok8 := latestTwo(byField, fieldGrossProfit)
	revenueC, revenueP, ok9 := latestTwo(byField, fieldTotalRevenue)

	if !(ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && ok7 && ok8 && ok9) {
		return nil, fmt.Errorf("insufficient financial statement history (need 2 fiscal years)")
	}
	if assetsC == 0 || assetsP == 0 || revenueC == 0 || revenueP == 0 || curLiabC == 0 || curLiabP == 0 {
		return nil, fmt.Errorf("cannot compute ratios: zero denominator in financial statement data")
	}

	roaC := netIncomeC / assetsC
	roaP := netIncomeP / assetsP
	leverageC := debtC / assetsC
	leverageP := debtP / assetsP
	currentRatioC := curAssetsC / curLiabC
	currentRatioP := curAssetsP / curLiabP
	grossMarginC := grossC / revenueC
	grossMarginP := grossP / revenueP
	turnoverC := revenueC / assetsC
	turnoverP := revenueP / assetsP

	criteria := []model.PiotroskiCriterion{
		{Label: "Pozitif aktif karlılığı (ROA)", Pass: roaC > 0},
		{Label: "Pozitif faaliyet nakit akışı", Pass: cfoC > 0},
		{Label: "ROA önceki yıla göre arttı", Pass: roaC > roaP},
		{Label: "Nakit akışı net kârdan yüksek", Pass: cfoC > netIncomeC},
		{Label: "Uzun vadeli borç oranı düştü", Pass: leverageC < leverageP},
		{Label: "Cari oran arttı", Pass: currentRatioC > currentRatioP},
		{Label: "Hisse seyreltmesi yok", Pass: sharesC <= sharesP},
		{Label: "Brüt kâr marjı arttı", Pass: grossMarginC > grossMarginP},
		{Label: "Aktif devir hızı arttı", Pass: turnoverC > turnoverP},
	}

	score := 0
	for _, c := range criteria {
		if c.Pass {
			score++
		}
	}

	fiscalYear := ""
	if entries, ok := byField[fieldTotalAssets]; ok && len(entries) > 0 {
		fiscalYear = entries[len(entries)-1].AsOfDate
	}

	return &model.PiotroskiScore{
		Score:      score,
		MaxScore:   len(criteria),
		FiscalYear: fiscalYear,
		Criteria:   criteria,
	}, nil
}
