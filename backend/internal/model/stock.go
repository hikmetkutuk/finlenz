package model

type StockData struct {
	Ticker        string   `json:"ticker"`
	CompanyName   string   `json:"companyName"`
	CurrentPrice  float64  `json:"currentPrice"`
	PercentChange float64  `json:"percentChange"`
	Currency      string   `json:"currency"`
	PERatio       *float64 `json:"peRatio"`
	PBRatio       *float64 `json:"pbRatio"`
	EVToEBITDA    *float64 `json:"evToEBITDA"`
	MarketCap     *float64 `json:"marketCap"`
	RevenueTTM    *float64 `json:"revenueTTM"`
	RevenueYoYPct *float64 `json:"revenueYoYPct"`
	EBITDA        *float64 `json:"ebitda"`
	NetIncome     *float64 `json:"netIncome"`
	EBITDAMargin  *float64 `json:"ebitdaMargin"`
	NetMargin     *float64 `json:"netMargin"`
	ROIC          *float64 `json:"roic"`
}

type CompareResponse struct {
	Data      []*StockData `json:"data"`
	Error     *string      `json:"error"`
	Timestamp string       `json:"timestamp"`
}
