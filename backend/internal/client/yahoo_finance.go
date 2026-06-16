package client

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/hikmetkutuk/finlenz/backend/internal/model"
)

const (
	baseURL     = "https://query1.finance.yahoo.com/v10/finance/quoteSummary"
	chartURL    = "https://query1.finance.yahoo.com/v8/finance/chart"
	cacheTTL    = 5 * time.Minute
	historyTTL  = 15 * time.Minute
	httpTimeout = 15 * time.Second
)

type cacheEntry struct {
	data      *model.StockData
	expiresAt time.Time
}

type historyCacheEntry struct {
	points    []model.HistoryPoint
	expiresAt time.Time
}

type YahooFinanceClient struct {
	httpClient   *http.Client
	crumb        string
	crumbMu      sync.Mutex
	cache        map[string]*cacheEntry
	historyCache map[string]*historyCacheEntry
	mu           sync.Mutex
}

func NewYahooFinanceClient() *YahooFinanceClient {
	jar, _ := cookiejar.New(nil)
	return &YahooFinanceClient{
		httpClient: &http.Client{
			Timeout: httpTimeout,
			Jar:     jar,
		},
		cache:        make(map[string]*cacheEntry),
		historyCache: make(map[string]*historyCacheEntry),
	}
}

var browserHeaders = map[string]string{
	"User-Agent":      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.9",
}

func (c *YahooFinanceClient) initSession() error {
	c.crumbMu.Lock()
	defer c.crumbMu.Unlock()

	if c.crumb != "" {
		return nil
	}

	// Step 1: visit finance.yahoo.com to get cookies
	req, _ := http.NewRequest("GET", "https://finance.yahoo.com", nil)
	for k, v := range browserHeaders {
		req.Header.Set(k, v)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("session init failed: %w", err)
	}
	io.Copy(io.Discard, resp.Body)
	resp.Body.Close()

	// Step 2: get crumb
	crumbReq, _ := http.NewRequest("GET", "https://query1.finance.yahoo.com/v1/test/getcrumb", nil)
	for k, v := range browserHeaders {
		crumbReq.Header.Set(k, v)
	}
	crumbReq.Header.Set("Accept", "text/plain")

	crumbResp, err := c.httpClient.Do(crumbReq)
	if err != nil {
		return fmt.Errorf("crumb fetch failed: %w", err)
	}
	defer crumbResp.Body.Close()

	body, _ := io.ReadAll(crumbResp.Body)
	crumb := strings.TrimSpace(string(body))

	if crumbResp.StatusCode != 200 || crumb == "" || strings.Contains(crumb, "error") {
		return fmt.Errorf("invalid crumb response (status %d): %s", crumbResp.StatusCode, crumb)
	}

	c.crumb = crumb
	return nil
}

func (c *YahooFinanceClient) GetStockData(symbol string) (*model.StockData, error) {
	c.mu.Lock()
	if entry, ok := c.cache[symbol]; ok && time.Now().Before(entry.expiresAt) {
		c.mu.Unlock()
		return entry.data, nil
	}
	c.mu.Unlock()

	if err := c.initSession(); err != nil {
		return nil, err
	}

	data, err := c.fetchStockData(symbol)
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	c.cache[symbol] = &cacheEntry{data: data, expiresAt: time.Now().Add(cacheTTL)}
	c.mu.Unlock()

	return data, nil
}

type yahooResponse struct {
	QuoteSummary struct {
		Result []struct {
			Price struct {
				Symbol             string `json:"symbol"`
				LongName           string `json:"longName"`
				ShortName          string `json:"shortName"`
				RegularMarketPrice struct {
					Raw float64 `json:"raw"`
				} `json:"regularMarketPrice"`
				RegularMarketChangePercent struct {
					Raw float64 `json:"raw"`
				} `json:"regularMarketChangePercent"`
				Currency  string `json:"currency"`
				MarketCap struct {
					Raw float64 `json:"raw"`
				} `json:"marketCap"`
			} `json:"price"`
			DefaultKeyStatistics struct {
				PriceToBook struct {
					Raw float64 `json:"raw"`
				} `json:"priceToBook"`
				EnterpriseToEbitda struct {
					Raw float64 `json:"raw"`
				} `json:"enterpriseToEbitda"`
				ReturnOnInvestedCapital struct {
					Raw float64 `json:"raw"`
				} `json:"returnOnInvestedCapital"`
			} `json:"defaultKeyStatistics"`
			SummaryDetail struct {
				TrailingPE struct {
					Raw float64 `json:"raw"`
				} `json:"trailingPE"`
			} `json:"summaryDetail"`
			FinancialData struct {
				TotalRevenue struct {
					Raw float64 `json:"raw"`
				} `json:"totalRevenue"`
				Ebitda struct {
					Raw float64 `json:"raw"`
				} `json:"ebitda"`
				NetIncomeToCommon struct {
					Raw float64 `json:"raw"`
				} `json:"netIncomeToCommon"`
				GrossMargins struct {
					Raw float64 `json:"raw"`
				} `json:"grossMargins"`
				EbitdaMargins struct {
					Raw float64 `json:"raw"`
				} `json:"ebitdaMargins"`
				ProfitMargins struct {
					Raw float64 `json:"raw"`
				} `json:"profitMargins"`
				RevenueGrowth struct {
					Raw float64 `json:"raw"`
				} `json:"revenueGrowth"`
				ReturnOnEquity struct {
					Raw float64 `json:"raw"`
				} `json:"returnOnEquity"`
				ReturnOnAssets struct {
					Raw float64 `json:"raw"`
				} `json:"returnOnAssets"`
				CurrentRatio struct {
					Raw float64 `json:"raw"`
				} `json:"currentRatio"`
				// DebtToEquity: Yahoo reports as percentage (85 = 85%), nullable to detect absence
				DebtToEquity struct {
					Raw *float64 `json:"raw"`
				} `json:"debtToEquity"`
				// TotalCash/TotalDebt: nullable to detect absence vs. genuine zero
				TotalCash struct {
					Raw *float64 `json:"raw"`
				} `json:"totalCash"`
				TotalDebt struct {
					Raw *float64 `json:"raw"`
				} `json:"totalDebt"`
			} `json:"financialData"`
		} `json:"result"`
		Error any `json:"error"`
	} `json:"quoteSummary"`
}

func (c *YahooFinanceClient) fetchStockData(symbol string) (*model.StockData, error) {
	apiURL, _ := url.Parse(fmt.Sprintf("%s/%s", baseURL, symbol))
	q := apiURL.Query()
	q.Set("modules", "price,summaryDetail,defaultKeyStatistics,financialData")
	q.Set("crumb", c.crumb)
	apiURL.RawQuery = q.Encode()

	req, _ := http.NewRequest("GET", apiURL.String(), nil)
	for k, v := range browserHeaders {
		req.Header.Set(k, v)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed for %s: %w", symbol, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		// reset crumb so next call re-authenticates
		c.crumbMu.Lock()
		c.crumb = ""
		c.crumbMu.Unlock()
		return nil, fmt.Errorf("authentication error for %s (status %d)", symbol, resp.StatusCode)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("yahoo finance returned status %d for %s", resp.StatusCode, symbol)
	}

	var yr yahooResponse
	if err := json.NewDecoder(resp.Body).Decode(&yr); err != nil {
		return nil, fmt.Errorf("failed to decode response for %s: %w", symbol, err)
	}

	if len(yr.QuoteSummary.Result) == 0 {
		return nil, fmt.Errorf("no data found for symbol %s", symbol)
	}

	r := yr.QuoteSummary.Result[0]

	name := r.Price.LongName
	if name == "" {
		name = r.Price.ShortName
	}

	data := &model.StockData{
		Ticker:        symbol,
		CompanyName:   name,
		CurrentPrice:  r.Price.RegularMarketPrice.Raw,
		PercentChange: r.Price.RegularMarketChangePercent.Raw * 100,
		Currency:      r.Price.Currency,
	}

	ptr := func(v float64) *float64 {
		if v == 0 {
			return nil
		}
		x := v
		return &x
	}

	data.MarketCap = ptr(r.Price.MarketCap.Raw)
	data.PERatio = ptr(r.SummaryDetail.TrailingPE.Raw)
	data.PBRatio = ptr(r.DefaultKeyStatistics.PriceToBook.Raw)
	data.EVToEBITDA = ptr(r.DefaultKeyStatistics.EnterpriseToEbitda.Raw)
	data.ROIC = ptr(r.DefaultKeyStatistics.ReturnOnInvestedCapital.Raw * 100)
	data.RevenueTTM = ptr(r.FinancialData.TotalRevenue.Raw)
	data.EBITDA = ptr(r.FinancialData.Ebitda.Raw)
	data.NetIncome = ptr(r.FinancialData.NetIncomeToCommon.Raw)
	data.GrossMargin = ptr(r.FinancialData.GrossMargins.Raw * 100)
	data.EBITDAMargin = ptr(r.FinancialData.EbitdaMargins.Raw * 100)
	data.NetMargin = ptr(r.FinancialData.ProfitMargins.Raw * 100)
	data.RevenueYoYPct = ptr(r.FinancialData.RevenueGrowth.Raw * 100)
	data.ROE = ptr(r.FinancialData.ReturnOnEquity.Raw * 100)
	data.ROA = ptr(r.FinancialData.ReturnOnAssets.Raw * 100)
	data.CurrentRatio = ptr(r.FinancialData.CurrentRatio.Raw)

	// Yahoo reports debtToEquity as a percentage (85 = 85%); convert to ratio (0.85)
	if r.FinancialData.DebtToEquity.Raw != nil {
		v := *r.FinancialData.DebtToEquity.Raw / 100
		data.DebtToEquity = &v
	}

	// Net Borç/FAVÖK = (Toplam Borç - Nakit) / FAVÖK
	// Only compute when all three inputs are explicitly present in the response
	rawDebt := r.FinancialData.TotalDebt.Raw
	rawCash := r.FinancialData.TotalCash.Raw
	ebitda := r.FinancialData.Ebitda.Raw
	if rawDebt != nil && rawCash != nil && ebitda != 0 {
		v := (*rawDebt - *rawCash) / ebitda
		data.NetDebtToEBITDA = &v
	}

	return data, nil
}

// validHistoryRanges maps allowed user-facing range values to Yahoo's
// chart API range/interval parameters.
var validHistoryRanges = map[string]string{
	"1mo": "1d",
	"3mo": "1d",
	"6mo": "1d",
	"1y":  "1wk",
	"5y":  "1mo",
}

type chartResponse struct {
	Chart struct {
		Result []struct {
			Timestamp  []int64 `json:"timestamp"`
			Indicators struct {
				Quote []struct {
					Close []*float64 `json:"close"`
				} `json:"quote"`
			} `json:"indicators"`
		} `json:"result"`
		Error any `json:"error"`
	} `json:"chart"`
}

// GetHistory returns historical closing prices for symbol over rangeParam
// (one of: 1mo, 3mo, 6mo, 1y, 5y). Results are cached in-memory.
func (c *YahooFinanceClient) GetHistory(symbol, rangeParam string) ([]model.HistoryPoint, error) {
	interval, ok := validHistoryRanges[rangeParam]
	if !ok {
		return nil, fmt.Errorf("invalid range %q", rangeParam)
	}

	cacheKey := symbol + ":" + rangeParam
	c.mu.Lock()
	if entry, ok := c.historyCache[cacheKey]; ok && time.Now().Before(entry.expiresAt) {
		c.mu.Unlock()
		return entry.points, nil
	}
	c.mu.Unlock()

	if err := c.initSession(); err != nil {
		return nil, err
	}

	points, err := c.fetchHistory(symbol, rangeParam, interval)
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	c.historyCache[cacheKey] = &historyCacheEntry{points: points, expiresAt: time.Now().Add(historyTTL)}
	c.mu.Unlock()

	return points, nil
}

func (c *YahooFinanceClient) fetchHistory(symbol, rangeParam, interval string) ([]model.HistoryPoint, error) {
	apiURL, _ := url.Parse(fmt.Sprintf("%s/%s", chartURL, symbol))
	q := apiURL.Query()
	q.Set("range", rangeParam)
	q.Set("interval", interval)
	q.Set("crumb", c.crumb)
	apiURL.RawQuery = q.Encode()

	req, _ := http.NewRequest("GET", apiURL.String(), nil)
	for k, v := range browserHeaders {
		req.Header.Set(k, v)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("history request failed for %s: %w", symbol, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		c.crumbMu.Lock()
		c.crumb = ""
		c.crumbMu.Unlock()
		return nil, fmt.Errorf("authentication error for %s history (status %d)", symbol, resp.StatusCode)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("yahoo finance chart returned status %d for %s", resp.StatusCode, symbol)
	}

	var cr chartResponse
	if err := json.NewDecoder(resp.Body).Decode(&cr); err != nil {
		return nil, fmt.Errorf("failed to decode history response for %s: %w", symbol, err)
	}

	if len(cr.Chart.Result) == 0 || len(cr.Chart.Result[0].Indicators.Quote) == 0 {
		return nil, fmt.Errorf("no history data found for symbol %s", symbol)
	}

	res := cr.Chart.Result[0]
	closes := res.Indicators.Quote[0].Close

	points := make([]model.HistoryPoint, 0, len(res.Timestamp))
	for i, ts := range res.Timestamp {
		if i >= len(closes) || closes[i] == nil {
			continue
		}
		points = append(points, model.HistoryPoint{
			Date:  time.Unix(ts, 0).UTC().Format("2006-01-02"),
			Close: *closes[i],
		})
	}

	return points, nil
}
