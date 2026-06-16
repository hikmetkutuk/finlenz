import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSectors, fetchStocks } from "../lib/api";
import type { StockListItem } from "../lib/types";
import { translateSector, translateIndustry } from "../lib/utils";

const thClass =
  "text-left px-4 py-3 text-slate-400 font-medium cursor-pointer select-none hover:text-slate-200 transition-colors";

const SORT_KEY = {
  TICKER: "Ticker",
  NAME: "Name",
  SECTOR: "Sector",
} as const;

type SortKey = (typeof SORT_KEY)[keyof typeof SORT_KEY];

const SORT_DIR = {
  ASC: "asc",
  DESC: "desc",
} as const;

type SortDir = (typeof SORT_DIR)[keyof typeof SORT_DIR];

function sortIndicator(active: boolean, dir: SortDir): string {
  if (!active) return "";
  return dir === SORT_DIR.ASC ? " ▲" : " ▼";
}

export default function HomePage() {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [industry, setIndustry] = useState("");
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(SORT_KEY.TICKER);
  const [sortDir, setSortDir] = useState<SortDir>(SORT_DIR.ASC);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

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
    const result = stocks.filter((s) => {
      if (industry && s.Industry !== industry) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return (
          s.Ticker.toLowerCase().includes(q) || s.Name.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const sorted = [...result].sort((a, b) => {
      const cmp = a[sortKey].localeCompare(b[sortKey], "tr");
      return sortDir === SORT_DIR.ASC ? cmp : -cmp;
    });

    return sorted;
  }, [stocks, industry, debouncedSearch, sortKey, sortDir]);

  const hasActiveFilters = sector !== "" || industry !== "" || search !== "";

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === SORT_DIR.ASC ? SORT_DIR.DESC : SORT_DIR.ASC);
    } else {
      setSortKey(key);
      setSortDir(SORT_DIR.ASC);
    }
  }

  function clearFilters() {
    setSector("");
    setIndustry("");
    setSearch("");
  }

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

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-4 py-2 transition-colors"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th
                className={thClass}
                onClick={() => handleSort(SORT_KEY.TICKER)}
              >
                Ticker{sortIndicator(sortKey === SORT_KEY.TICKER, sortDir)}
              </th>
              <th className={thClass} onClick={() => handleSort(SORT_KEY.NAME)}>
                Şirket{sortIndicator(sortKey === SORT_KEY.NAME, sortDir)}
              </th>
              <th
                className={thClass}
                onClick={() => handleSort(SORT_KEY.SECTOR)}
              >
                Sektör{sortIndicator(sortKey === SORT_KEY.SECTOR, sortDir)}
              </th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">
                Endüstri
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.Ticker}
                className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/stock/${s.Ticker}`)}
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
