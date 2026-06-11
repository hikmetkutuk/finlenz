import { useEffect, useState } from "react";
import { fetchSectors, fetchStocks } from "../lib/api";
import type { StockListItem } from "../lib/types";

interface Props {
  readonly label: string;
  readonly value: string;
  readonly onChange: (ticker: string) => void;
}

export default function StockPicker({ label, value, onChange }: Props) {
  const [sectors, setSectors] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [search, setSearch] = useState("");

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

  const filtered = search
    ? stocks.filter(
        (s) =>
          s.Ticker.toLowerCase().includes(search.toLowerCase()) ||
          s.Name.toLowerCase().includes(search.toLowerCase()),
      )
    : stocks;

  const selected = stocks.find((s) => s.Ticker === value);

  return (
    <div className="w-full min-w-0">
      <div className="text-xs text-slate-400 mb-1">{label}</div>

      <select
        value={sector}
        onChange={(e) => {
          setSector(e.target.value);
          onChange("");
        }}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-blue-500"
      >
        <option value="">Tüm Sektörler</option>
        {sectors.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Hisse ara..."
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-2 focus:outline-none focus:border-blue-500"
      />

      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-y-auto max-h-48">
        {filtered.length === 0 ? (
          <div className="text-slate-500 text-sm px-3 py-2">Sonuç yok</div>
        ) : (
          filtered.map((s) => (
            <button
              key={s.Ticker}
              onClick={() => onChange(s.Ticker)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0 flex items-center gap-2 min-w-0 ${
                value === s.Ticker
                  ? "bg-blue-900/40 text-blue-300"
                  : "text-slate-200"
              }`}
            >
              <span className="font-medium shrink-0">{s.Ticker}</span>
              <span className="text-slate-400 text-xs truncate">{s.Name}</span>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="mt-2 text-xs text-slate-400">
          Seçili:{" "}
          <span className="text-blue-400 font-medium">{selected.Ticker}</span> —{" "}
          {selected.Industry}
        </div>
      )}
    </div>
  );
}
