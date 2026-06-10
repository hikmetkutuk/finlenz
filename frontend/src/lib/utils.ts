export function formatPrice(value: number, currency: string): string {
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : currency
  return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`
}

export function formatLargeNumber(value: number | undefined, currency: string): string {
  if (value == null) return 'N/A'
  const symbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : currency
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)} Mr ${symbol}`
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)} Mn ${symbol}`
  return `${value.toLocaleString('tr-TR')} ${symbol}`
}

export function formatPercent(value: number | undefined): string {
  if (value == null) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}%${Math.abs(value).toFixed(1)}`
}

export function formatMultiple(value: number | undefined): string {
  if (value == null) return 'N/A'
  return `${value.toFixed(1)}x`
}

export function formatRatio(value: number | undefined): string {
  if (value == null) return 'N/A'
  return value.toFixed(2)
}
