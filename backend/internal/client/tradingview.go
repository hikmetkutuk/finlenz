package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const (
	tvURL      = "https://scanner.tradingview.com/turkey/scan"
	tvPageSize = 500
)

type Stock struct {
	Ticker   string
	Name     string
	Sector   string
	Industry string
}

type TradingViewClient struct {
	httpClient *http.Client
}

func NewTradingViewClient() *TradingViewClient {
	return &TradingViewClient{
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

type tvRequest struct {
	Columns []string `json:"columns"`
	Range   [2]int   `json:"range"`
	Sort    tvSort   `json:"sort"`
}

type tvSort struct {
	SortBy    string `json:"sortBy"`
	SortOrder string `json:"sortOrder"`
}

type tvResponse struct {
	TotalCount int `json:"totalCount"`
	Data       []struct {
		S string        `json:"s"`
		D []interface{} `json:"d"`
	} `json:"data"`
}

func (c *TradingViewClient) FetchAllStocks() ([]Stock, error) {
	var stocks []Stock
	offset := 0

	for {
		page, total, err := c.fetchPage(offset, tvPageSize)
		if err != nil {
			return nil, err
		}
		stocks = append(stocks, page...)
		offset += len(page)
		if offset >= total || len(page) == 0 {
			break
		}
	}

	return stocks, nil
}

func (c *TradingViewClient) fetchPage(offset, size int) ([]Stock, int, error) {
	payload := tvRequest{
		Columns: []string{"name", "description", "sector", "industry"},
		Range:   [2]int{offset, offset + size},
		Sort:    tvSort{SortBy: "name", SortOrder: "asc"},
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", tvURL, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("tradingview request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("tradingview returned status %d", resp.StatusCode)
	}

	var tvResp tvResponse
	if err := json.NewDecoder(resp.Body).Decode(&tvResp); err != nil {
		return nil, 0, fmt.Errorf("decode tradingview response: %w", err)
	}

	stocks := make([]Stock, 0, len(tvResp.Data))
	for _, item := range tvResp.Data {
		if len(item.D) < 4 {
			continue
		}
		stock := Stock{
			Ticker:   getString(item.D[0]),
			Name:     getString(item.D[1]),
			Sector:   getString(item.D[2]),
			Industry: getString(item.D[3]),
		}
		if stock.Ticker == "" {
			continue
		}
		stocks = append(stocks, stock)
	}

	return stocks, tvResp.TotalCount, nil
}

func getString(v interface{}) string {
	if v == nil {
		return ""
	}
	s, _ := v.(string)
	return s
}
