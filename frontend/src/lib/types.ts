export interface StockData {
  ticker: string;
  companyName: string;
  currentPrice: number;
  percentChange: number;
  currency: string;
  peRatio?: number;
  pbRatio?: number;
  evToEBITDA?: number;
  marketCap?: number;
  revenueTTM?: number;
  revenueYoYPct?: number;
  ebitda?: number;
  netIncome?: number;
  ebitdaMargin?: number;
  netMargin?: number;
  roic?: number;
}

export interface StockListItem {
  Ticker: string;
  Name: string;
  Sector: string;
  Industry: string;
}

export interface StockDetail extends StockData {
  sector: string;
  industry: string;
}

export interface CompareResponse {
  data: StockData[];
  error: string | null;
  timestamp: string;
}
