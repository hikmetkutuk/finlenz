package model

type StockData struct {
	Ticker        string  `json:"ticker"`
	CompanyName   string  `json:"companyName"`
	CurrentPrice  float64 `json:"currentPrice"`
	PercentChange float64 `json:"percentChange"`
	Currency      string  `json:"currency"`
	// Değerleme
	PERatio    *float64 `json:"peRatio"`
	PBRatio    *float64 `json:"pbRatio"`
	EVToEBITDA *float64 `json:"evToEBITDA"`
	MarketCap  *float64 `json:"marketCap"`
	// Büyüme
	RevenueTTM    *float64 `json:"revenueTTM"`
	RevenueYoYPct *float64 `json:"revenueYoYPct"`
	EBITDA        *float64 `json:"ebitda"`
	NetIncome     *float64 `json:"netIncome"`
	// Kârlılık
	GrossMargin  *float64 `json:"grossMargin"`
	EBITDAMargin *float64 `json:"ebitdaMargin"`
	NetMargin    *float64 `json:"netMargin"`
	ROE          *float64 `json:"roe"`
	ROA          *float64 `json:"roa"`
	ROIC         *float64 `json:"roic"`
	// Borçluluk
	CurrentRatio    *float64 `json:"currentRatio"`
	DebtToEquity    *float64 `json:"debtToEquity"`
	NetDebtToEBITDA *float64 `json:"netDebtToEBITDA"`
}

type StockDetailResponse struct {
	*StockData
	Sector   string `json:"sector"`
	Industry string `json:"industry"`
}

type HistoryPoint struct {
	Date  string  `json:"date"`
	Close float64 `json:"close"`
}

// SectorAverages holds mean values of key metrics across all stocks in a sector.
// Fields are nil when no data is available.
type SectorAverages struct {
	Sector     string `json:"sector"`
	StockCount int    `json:"stockCount"`
	// Değerleme
	PERatio    *float64 `json:"peRatio"`
	PBRatio    *float64 `json:"pbRatio"`
	EVToEBITDA *float64 `json:"evToEBITDA"`
	// Kârlılık
	GrossMargin  *float64 `json:"grossMargin"`
	EBITDAMargin *float64 `json:"ebitdaMargin"`
	NetMargin    *float64 `json:"netMargin"`
	ROE          *float64 `json:"roe"`
	ROA          *float64 `json:"roa"`
	// Borçluluk
	CurrentRatio    *float64 `json:"currentRatio"`
	DebtToEquity    *float64 `json:"debtToEquity"`
	NetDebtToEBITDA *float64 `json:"netDebtToEBITDA"`
}

// PiotroskiCriterion is a single pass/fail test within the F-Score.
type PiotroskiCriterion struct {
	Label string `json:"label"`
	Pass  bool   `json:"pass"`
}

// PiotroskiScore is Joseph Piotroski's 9-point fundamental strength score,
// computed from two consecutive fiscal years of financial statement data.
type PiotroskiScore struct {
	Score      int                  `json:"score"`
	MaxScore   int                  `json:"maxScore"`
	FiscalYear string               `json:"fiscalYear"`
	Criteria   []PiotroskiCriterion `json:"criteria"`
}

type CompareResponse struct {
	Data      []*StockData `json:"data"`
	Error     *string      `json:"error"`
	Timestamp string       `json:"timestamp"`
}
