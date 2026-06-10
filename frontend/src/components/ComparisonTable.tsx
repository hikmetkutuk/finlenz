import type { StockData } from '../lib/types'
import { formatLargeNumber, formatMultiple, formatPercent, formatRatio } from '../lib/utils'

interface Props {
  stocks: StockData[]
}

type BetterDirection = 'lower' | 'higher' | 'none'

interface MetricRow {
  label: string
  key: keyof StockData
  format: (v: number | undefined, currency: string) => string
  better: BetterDirection
}

const SECTIONS: { title: string; rows: MetricRow[] }[] = [
  {
    title: 'DEĞERLEME',
    rows: [
      { label: 'F/K Oranı', key: 'peRatio', format: (v) => formatRatio(v), better: 'lower' },
      { label: 'PD/DD Oranı', key: 'pbRatio', format: (v) => formatRatio(v), better: 'lower' },
      { label: 'EV/EBITDA', key: 'evToEBITDA', format: (v) => formatMultiple(v), better: 'lower' },
      { label: 'Piyasa Değeri', key: 'marketCap', format: (v, c) => formatLargeNumber(v, c), better: 'none' },
    ],
  },
  {
    title: 'BÜYÜME',
    rows: [
      { label: 'Hasılat (TTM)', key: 'revenueTTM', format: (v, c) => formatLargeNumber(v, c), better: 'higher' },
      { label: 'Hasılat YoY', key: 'revenueYoYPct', format: (v) => formatPercent(v), better: 'higher' },
    ],
  },
  {
    title: 'KÂRLILIK',
    rows: [
      { label: 'EBITDA', key: 'ebitda', format: (v, c) => formatLargeNumber(v, c), better: 'higher' },
      { label: 'Net Kâr', key: 'netIncome', format: (v, c) => formatLargeNumber(v, c), better: 'higher' },
      { label: 'EBITDA Marjı', key: 'ebitdaMargin', format: (v) => formatPercent(v), better: 'higher' },
      { label: 'Net Marj', key: 'netMargin', format: (v) => formatPercent(v), better: 'higher' },
      { label: 'ROIC', key: 'roic', format: (v) => formatPercent(v), better: 'higher' },
    ],
  },
]

function isBetter(a: number | undefined, b: number | undefined, direction: BetterDirection): [boolean, boolean] {
  if (direction === 'none' || a == null || b == null) return [false, false]
  if (direction === 'lower') return [a < b, b < a]
  return [a > b, b > a]
}

export default function ComparisonTable({ stocks }: Props) {
  const [s1, s2] = stocks

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      {/* Header */}
      <div className="grid grid-cols-3 p-6 border-b border-slate-700">
        <div>
          <div className="text-2xl font-bold text-blue-400">{s1.ticker.split('.')[0]}</div>
          <div className="text-xs text-slate-400 mt-1">{s1.companyName.toUpperCase()}</div>
          <div className="text-xl font-semibold mt-2">{s1.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
          <div className={`text-sm mt-1 ${s1.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {s1.percentChange >= 0 ? '+' : ''}{s1.percentChange.toFixed(2)}%
          </div>
        </div>
        <div className="flex items-center justify-center text-slate-500 font-medium">VS</div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-400">{s2.ticker.split('.')[0]}</div>
          <div className="text-xs text-slate-400 mt-1">{s2.companyName.toUpperCase()}</div>
          <div className="text-xl font-semibold mt-2">{s2.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</div>
          <div className={`text-sm mt-1 ${s2.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {s2.percentChange >= 0 ? '+' : ''}{s2.percentChange.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-3 px-6 py-2 border-b border-slate-700 text-xs font-semibold text-slate-400">
        <div />
        <div className="text-center text-blue-400">{s1.ticker.split('.')[0]}</div>
        <div className="text-right text-blue-400">{s2.ticker.split('.')[0]}</div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="px-6 py-3 text-xs font-semibold tracking-widest text-slate-500 bg-slate-800/50">
            {section.title}
          </div>
          {section.rows.map((row) => {
            const v1 = s1[row.key] as number | undefined
            const v2 = s2[row.key] as number | undefined
            const [b1, b2] = isBetter(v1, v2, row.better)
            return (
              <div key={row.key} className="grid grid-cols-3 px-6 py-3 border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                <div className="text-sm text-slate-300">{row.label}</div>
                <div className={`text-sm text-center font-medium ${b1 ? 'text-green-400' : 'text-slate-200'}`}>
                  {row.format(v1, s1.currency)}
                </div>
                <div className={`text-sm text-right font-medium ${b2 ? 'text-green-400' : 'text-slate-200'}`}>
                  {row.format(v2, s2.currency)}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
