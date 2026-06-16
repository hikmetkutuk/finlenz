import type {
  CompareResponse,
  HistoryPoint,
  StockDetail,
  StockListItem,
} from "./types";

const ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? "";

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

export async function fetchStockDetail(ticker: string): Promise<StockDetail> {
  const resp = await fetch(`/api/stocks/${encodeURIComponent(ticker)}`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchStockHistory(
  ticker: string,
  range: string,
): Promise<HistoryPoint[]> {
  const resp = await fetch(
    `/api/stocks/${encodeURIComponent(ticker)}/history?range=${encodeURIComponent(range)}`,
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function saveOverride(
  ticker: string,
  sector: string,
  industry: string,
): Promise<void> {
  const resp = await fetch(
    `/api/admin/overrides/${encodeURIComponent(ticker)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADMIN_KEY}`,
      },
      body: JSON.stringify({ sector, industry }),
    },
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

export async function deleteOverride(ticker: string): Promise<void> {
  const resp = await fetch(
    `/api/admin/overrides/${encodeURIComponent(ticker)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ADMIN_KEY}` },
    },
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

export async function fetchComparison(
  ticker1: string,
  ticker2: string,
  signal?: AbortSignal,
): Promise<CompareResponse> {
  const resp = await fetch(
    `/api/compare?symbols=${encodeURIComponent(ticker1)},${encodeURIComponent(ticker2)}`,
    { signal },
  );
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}
