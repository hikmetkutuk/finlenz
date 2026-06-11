import { useState } from "react";
import { fetchComparison } from "./lib/api";
import type { StockData } from "./lib/types";
import ComparisonTable from "./components/ComparisonTable";
import StockPicker from "./components/StockPicker";

export default function App() {
  const [ticker1, setTicker1] = useState("");
  const [ticker2, setTicker2] = useState("");
  const [stocks, setStocks] = useState<StockData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare() {
    if (!ticker1 || !ticker2) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchComparison(
        ticker1 + ".IS",
        ticker2 + ".IS",
      );
      if (resp.data.length < 2) {
        setError(resp.error || "Veriler yüklenemedi");
        setStocks(null);
      } else {
        setStocks(resp.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu");
      setStocks(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Hisse Karşılaştırma
        </h1>

        <div className="flex gap-4 mb-6 items-start">
          <div className="flex-1 min-w-0">
            <StockPicker label="1. Hisse" value={ticker1} onChange={setTicker1} />
          </div>
          <div className="flex items-center pt-8 text-slate-500 font-medium text-lg shrink-0">
            VS
          </div>
          <div className="flex-1 min-w-0">
            <StockPicker label="2. Hisse" value={ticker2} onChange={setTicker2} />
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || !ticker1 || !ticker2}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mb-6"
        >
          {loading ? "Yükleniyor..." : "Karşılaştır"}
        </button>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {stocks?.length === 2 && !loading && (
          <ComparisonTable stocks={stocks} />
        )}
      </div>
    </div>
  );
}
