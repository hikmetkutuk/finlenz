import type { CompareResponse } from './types'

export async function fetchComparison(ticker1: string, ticker2: string): Promise<CompareResponse> {
  const resp = await fetch(`/api/compare?symbols=${encodeURIComponent(ticker1)},${encodeURIComponent(ticker2)}`)
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${resp.status}`)
  }
  return resp.json()
}
