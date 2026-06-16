import { useEffect, useRef, useState } from "react";
import { fetchSectors, fetchStocks } from "../lib/api";
import type { StockListItem } from "../lib/types";
import { translateSector, translateIndustry } from "../lib/utils";

interface Props {
  readonly label: string;
  readonly value: string;
  readonly onChange: (ticker: string) => void;
}

export default function StockPicker({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [sectors, setSectors] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSectors().then(setSectors).catch(console.error);
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

  const filtered = search
    ? stocks.filter(
        (s) =>
          s.Ticker.toLowerCase().includes(search.toLowerCase()) ||
          s.Name.toLowerCase().includes(search.toLowerCase()),
      )
    : stocks;

  const selected = stocks.find((s) => s.Ticker === value);

  function selectTicker(ticker: string) {
    onChange(ticker);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <div className="text-xs text-slate-400 mb-1">{label}</div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left bg-slate-800 border rounded-lg px-3 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
          open ? "border-blue-500" : "border-slate-700 hover:border-slate-600"
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-blue-400 shrink-0">
              {selected.Ticker}
            </span>
            <span className="text-slate-400 text-xs truncate">
              {selected.Name}
            </span>
          </span>
        ) : (
          <span className="text-slate-500">Hisse seç...</span>
        )}
        <span className="text-slate-500 shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl shadow-black/40 p-2">
          <div className="flex gap-2 mb-2">
            <select
              value={sector}
              onChange={(e) => {
                setSector(e.target.value);
                onChange("");
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Tüm Sektörler</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {translateSector(s)}
                </option>
              ))}
            </select>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hisse ara..."
              className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="overflow-y-auto max-h-56 rounded-lg border border-slate-700">
            {filtered.length === 0 ? (
              <div className="text-slate-500 text-sm px-3 py-3 text-center">
                Sonuç yok
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.Ticker}
                  type="button"
                  onClick={() => selectTicker(s.Ticker)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors border-b border-slate-700/60 last:border-0 flex items-center gap-2 min-w-0 ${
                    value === s.Ticker
                      ? "bg-blue-900/40 text-blue-300"
                      : "text-slate-200"
                  }`}
                >
                  <span className="font-medium shrink-0">{s.Ticker}</span>
                  <span className="text-slate-400 text-xs truncate">
                    {s.Name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selected && (
        <div className="mt-1 text-xs text-slate-500 truncate">
          {translateSector(selected.Sector)} ·{" "}
          {translateIndustry(selected.Industry)}
        </div>
      )}
    </div>
  );
}
