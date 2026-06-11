import type { CompareResponse, StockListItem } from "./types";

export async function fetchSectors(): Promise<string[]> {
  const resp = await fetch("/api/sectors");
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchStocks(sector?: string): Promise<StockListItem[]> {
  const url = sector
    ? `/api/stocks?sector=${encodeURIComponent(sector)}`
    : "/api/stocks";
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchComparison(
  ticker1: string,
  ticker2: string,
): Promise<CompareResponse> {
  const resp = await fetch(
    `/api/compare?symbols=${encodeURIComponent(ticker1)},${encodeURIComponent(ticker2)}`,
  );
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}
