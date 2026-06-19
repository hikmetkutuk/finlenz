export interface StockData {
  ticker: string;
  companyName: string;
  currentPrice: number;
  percentChange: number;
  currency: string;
  // Değerleme
  peRatio?: number;
  pbRatio?: number;
  evToEBITDA?: number;
  marketCap?: number;
  // Büyüme
  revenueTTM?: number;
  revenueYoYPct?: number;
  ebitda?: number;
  netIncome?: number;
  // Kârlılık
  grossMargin?: number;
  ebitdaMargin?: number;
  netMargin?: number;
  roe?: number;
  roa?: number;
  roic?: number;
  // Borçluluk
  currentRatio?: number;
  debtToEquity?: number;
  netDebtToEBITDA?: number;
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

export interface SectorAverages {
  sector: string;
  stockCount: number;
  peRatio?: number;
  pbRatio?: number;
  evToEBITDA?: number;
  grossMargin?: number;
  ebitdaMargin?: number;
  netMargin?: number;
  roe?: number;
  roa?: number;
  currentRatio?: number;
  debtToEquity?: number;
  netDebtToEBITDA?: number;
}

export interface PiotroskiCriterion {
  label: string;
  pass: boolean;
}

export interface PiotroskiScore {
  score: number;
  maxScore: number;
  fiscalYear: string;
  criteria: PiotroskiCriterion[];
}

export interface HistoryPoint {
  date: string;
  close: number;
}

export interface CompareResponse {
  data: StockData[];
  error: string | null;
  timestamp: string;
}
