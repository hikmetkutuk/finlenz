import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStocks } from "../lib/api";
import type { StockListItem } from "../lib/types";

const MAX_RESULTS = 8;

export default function StockQuickSearch() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStocks()
      .then(setStocks)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = q
    ? stocks
        .filter(
          (s) =>
            s.Ticker.toLowerCase().includes(q) ||
            s.Name.toLowerCase().includes(q),
        )
        .slice(0, MAX_RESULTS)
    : [];

  function goTo(ticker: string) {
    setQuery("");
    setOpen(false);
    navigate(`/stock/${ticker}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = results[activeIndex];
      if (picked) goTo(picked.Ticker);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-sm">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Başka bir hisseyi görüntüle..."
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#b347ff]"
      />

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl shadow-black/40 overflow-hidden">
          {results.map((s, i) => (
            <button
              key={s.Ticker}
              type="button"
              onClick={() => goTo(s.Ticker)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 min-w-0 transition-colors ${
                i === activeIndex
                  ? "bg-[#9D00FF]/20 text-[#d9a3ff]"
                  : "text-slate-200 hover:bg-slate-700"
              }`}
            >
              <span className="font-semibold shrink-0">{s.Ticker}</span>
              <span className="text-slate-400 text-xs truncate">{s.Name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
