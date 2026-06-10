import { useState } from 'react'
import { fetchComparison } from './lib/api'
import type { StockData } from './lib/types'
import ComparisonTable from './components/ComparisonTable'

export default function App() {
  const [ticker1, setTicker1] = useState('')
  const [ticker2, setTicker2] = useState('')
  const [stocks, setStocks] = useState<StockData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCompare() {
    if (!ticker1.trim() || !ticker2.trim()) return
    setLoading(true)
    setError(null)
    try {
      const resp = await fetchComparison(ticker1.trim().toUpperCase(), ticker2.trim().toUpperCase())
      if (resp.data.length < 2) {
        setError(resp.error || 'Veriler yüklenemedi')
        setStocks(null)
      } else {
        setStocks(resp.data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir hata oluştu')
      setStocks(null)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCompare()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Hisse Karşılaştırma</h1>

        <div className="flex gap-3 mb-8">
          <input
            value={ticker1}
            onChange={(e) => setTicker1(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="MGROS.IS"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
          />
          <div className="flex items-center text-slate-500 font-medium px-1">VS</div>
          <input
            value={ticker2}
            onChange={(e) => setTicker2(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="BIMAS.IS"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
          />
          <button
            onClick={handleCompare}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {loading ? '...' : 'Karşılaştır'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-slate-400 py-16">Veriler yükleniyor...</div>
        )}

        {stocks && stocks.length === 2 && !loading && (
          <ComparisonTable stocks={stocks} />
        )}
      </div>
    </div>
  )
}
