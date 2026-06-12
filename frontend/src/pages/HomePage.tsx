import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSectors, fetchStocks } from "../lib/api";
import type { StockListItem } from "../lib/types";
import { translateSector, translateIndustry } from "../lib/utils";

const thClass = "text-left px-4 py-3 text-slate-400 font-medium";

export default function HomePage() {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [industry, setIndustry] = useState("");
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchSectors()
      .then((data) => {
        if (!cancelled) setSectors(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchStocks(sector || undefined)
      .then((data) => {
        if (!cancelled) setStocks(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [sector]);

  function handleSectorChange(value: string) {
    setSector(value);
    setIndustry("");
  }

  const industries = useMemo(() => {
    if (!sector) return [];
    const set = new Set(stocks.map((s) => s.Industry).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"));
  }, [stocks, sector]);

  const filtered = useMemo(() => {
    return stocks.filter((s) => {
      if (industry && s.Industry !== industry) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.Ticker.toLowerCase().includes(q) || s.Name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stocks, industry, search]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-1">Hisseler</h2>
        <p className="text-slate-400 text-sm">{filtered.length} hisse</p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          aria-label="Sektör filtresi"
          value={sector}
          onChange={(e) => handleSectorChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Tüm Sektörler</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {translateSector(s)}
            </option>
          ))}
        </select>

        {industries.length > 0 && (
          <select
            aria-label="Endüstri filtresi"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Tüm Endüstriler</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {translateIndustry(i)}
              </option>
            ))}
          </select>
        )}

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hisse veya şirket ara..."
          className="flex-1 min-w-48 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th className={thClass}>Ticker</th>
              <th className={thClass}>Şirket</th>
              <th className={thClass}>Sektör</th>
              <th className={thClass}>Endüstri</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.Ticker}
                className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/compare?s1=${s.Ticker}`)}
              >
                <td className="px-4 py-3 font-semibold text-blue-400">
                  {s.Ticker}
                </td>
                <td className="px-4 py-3 text-slate-200 max-w-48 truncate">
                  {s.Name}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {translateSector(s.Sector)}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {translateIndustry(s.Industry)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/compare?s1=${s.Ticker}`);
                    }}
                    className="text-xs text-slate-500 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-slate-700"
                  >
                    Karşılaştır
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center text-slate-500 py-12 text-sm">
            Sonuç bulunamadı
          </div>
        )}
      </div>
    </main>
  );
}
