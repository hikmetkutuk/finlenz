import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchSectors, fetchStocks } from "../lib/api";
import type { StockListItem } from "../lib/types";
import { translateSector, translateIndustry } from "../lib/utils";

const thClass =
  "text-left px-4 py-3 text-slate-400 font-medium cursor-pointer select-none hover:text-slate-200 transition-colors";

const PAGE_SIZE = 50;
const MAX_COMPARE = 4;
const SLOT_PARAMS = ["s1", "s2", "s3", "s4"];

type PageItem =
  | { kind: "page"; num: number }
  | { kind: "ellipsis"; key: string };

function buildPageItems(current: number, total: number): PageItem[] {
  const items: PageItem[] = [];
  let prev: number | null = null;
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 2) {
      if (prev !== null && p - prev > 1) {
        items.push({ kind: "ellipsis", key: `gap-after-${prev}` });
      }
      items.push({ kind: "page", num: p });
      prev = p;
    }
  }
  return items;
}

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
  const [searchParams] = useSearchParams();
  const sectorParam = searchParams.get("sector") ?? "";
  const industryParam = searchParams.get("industry") ?? "";
  const [sectors, setSectors] = useState<string[]>([]);
  const [sector, setSector] = useState(() => sectorParam);
  const [industry, setIndustry] = useState(() => industryParam);
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(SORT_KEY.TICKER);
  const [sortDir, setSortDir] = useState<SortDir>(SORT_DIR.ASC);
  const [page, setPage] = useState(1);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  useEffect(() => {
    setSector(sectorParam);
    setIndustry(industryParam);
    setPage(1);
  }, [sectorParam, industryParam]);

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === SORT_DIR.ASC ? SORT_DIR.DESC : SORT_DIR.ASC);
    } else {
      setSortKey(key);
      setSortDir(SORT_DIR.ASC);
    }
    setPage(1);
  }

  function clearFilters() {
    setSector("");
    setIndustry("");
    setSearch("");
    setPage(1);
  }

  function handleSectorChangeWithReset(value: string) {
    handleSectorChange(value);
    setPage(1);
  }

  function toggleCompareSelection(ticker: string) {
    setCompareSelection((prev) => {
      if (prev.includes(ticker)) {
        return prev.filter((t) => t !== ticker);
      }
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, ticker];
    });
  }

  function clearCompareSelection() {
    setCompareSelection([]);
  }

  function goToComparison() {
    if (compareSelection.length < 2) return;
    const params: Record<string, string> = {};
    compareSelection.forEach((t, i) => {
      params[SLOT_PARAMS[i]] = t;
    });
    const query = new URLSearchParams(params).toString();
    navigate(`/compare?${query}`);
  }

  return (
    <main
      className={`max-w-4xl mx-auto px-4 py-10 ${compareSelection.length > 0 ? "pb-24" : ""}`}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-1">Hisseler</h2>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          aria-label="Sektör filtresi"
          value={sector}
          onChange={(e) => handleSectorChangeWithReset(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b347ff]"
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
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#b347ff]"
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
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Hisse veya şirket ara..."
          className="flex-1 min-w-48 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#b347ff]"
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
            {paginated.map((s) => {
              const isSelected = compareSelection.includes(s.Ticker);
              const selectionFull =
                !isSelected && compareSelection.length >= MAX_COMPARE;
              return (
                <tr
                  key={s.Ticker}
                  className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/stock/${s.Ticker}`)}
                >
                  <td className="px-4 py-3 font-semibold text-[#b347ff]">
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
                        toggleCompareSelection(s.Ticker);
                      }}
                      disabled={selectionFull}
                      className={`text-xs transition-colors px-2 py-1 rounded disabled:opacity-30 disabled:cursor-not-allowed ${
                        isSelected
                          ? "bg-[#9D00FF]/20 text-[#d9a3ff]"
                          : "text-slate-500 hover:text-[#b347ff] hover:bg-slate-700"
                      }`}
                    >
                      {isSelected ? "✓ Seçildi" : "Karşılaştır"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center text-slate-500 py-12 text-sm">
            Sonuç bulunamadı
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-sm">
            {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}{" "}
            hisse
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Önceki
            </button>
            {buildPageItems(page, totalPages).map((item) =>
              item.kind === "ellipsis" ? (
                <span key={item.key} className="px-2 text-slate-600 text-sm">
                  …
                </span>
              ) : (
                <button
                  key={item.num}
                  onClick={() => setPage(item.num)}
                  className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                    page === item.num
                      ? "bg-[#9D00FF] text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {item.num}
                </button>
              ),
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}

      {compareSelection.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-3 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-400">
                {compareSelection.length} hisse seçildi:
              </span>
              {compareSelection.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                >
                  {t}
                  <button
                    onClick={() => toggleCompareSelection(t)}
                    aria-label={`${t} seçimini kaldır`}
                    className="text-slate-500 hover:text-white"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearCompareSelection}
                className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg transition-colors"
              >
                Temizle
              </button>
              <button
                onClick={goToComparison}
                disabled={compareSelection.length < 2}
                className="text-sm bg-[#9D00FF] hover:bg-[#b347ff] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Karşılaştır ({compareSelection.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
