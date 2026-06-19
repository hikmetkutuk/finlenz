import { useEffect, useMemo, useState } from "react";
import { fetchStocks, saveOverride, deleteOverride } from "../lib/api";
import type { StockListItem } from "../lib/types";
import { translateSector, translateIndustry } from "../lib/utils";

const thClass =
  "text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wide";

async function handleDelete(ticker: string) {
  try {
    await deleteOverride(ticker);
  } catch (e) {
    console.error(e);
  }
}

interface EditState {
  ticker: string;
  sector: string;
  industry: string;
}

export default function AdminPage() {
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedTicker, setSavedTicker] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStocks()
      .then((data) => {
        if (!cancelled) setStocks(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search) return stocks;
    const q = search.toLowerCase();
    return stocks.filter(
      (s) =>
        s.Ticker.toLowerCase().includes(q) ||
        s.Name.toLowerCase().includes(q) ||
        s.Sector.toLowerCase().includes(q) ||
        s.Industry.toLowerCase().includes(q),
    );
  }, [stocks, search]);

  function startEdit(s: StockListItem) {
    setEditing({ ticker: s.Ticker, sector: s.Sector, industry: s.Industry });
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await saveOverride(editing.ticker, editing.sector, editing.industry);
      setStocks((prev) =>
        prev.map((s) =>
          s.Ticker === editing.ticker
            ? { ...s, Sector: editing.sector, Industry: editing.industry }
            : s,
        ),
      );
      setSavedTicker(editing.ticker);
      setTimeout(() => setSavedTicker(null), 2000);
      setEditing(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">
            Sektör / Endüstri Düzenleyici
          </h2>
          <p className="text-slate-400 text-sm">
            Yanlış sınıflandırılmış hisseleri düzelt
          </p>
        </div>
        <span className="text-slate-500 text-sm">{stocks.length} hisse</span>
      </div>

      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ticker, şirket, sektör veya endüstri ara..."
          className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#b347ff]"
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
            {filtered.map((s) => {
              const isEditing = editing?.ticker === s.Ticker;
              const isSaved = savedTicker === s.Ticker;
              return (
                <tr
                  key={s.Ticker}
                  className={`border-b border-slate-800 transition-colors ${isEditing ? "bg-slate-800/60" : "hover:bg-slate-800/30"}`}
                >
                  <td className="px-4 py-3 font-semibold text-[#b347ff] shrink-0">
                    {s.Ticker}
                    {isSaved && (
                      <span className="ml-2 text-xs text-green-400">✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-48 truncate">
                    {s.Name}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        value={editing.sector}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev ? { ...prev, sector: e.target.value } : prev,
                          )
                        }
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white w-full focus:outline-none focus:border-[#b347ff]"
                      />
                    ) : (
                      <span className="text-slate-300">
                        {translateSector(s.Sector)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        value={editing.industry}
                        onChange={(e) =>
                          setEditing((prev) =>
                            prev ? { ...prev, industry: e.target.value } : prev,
                          )
                        }
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white w-full focus:outline-none focus:border-[#b347ff]"
                      />
                    ) : (
                      <span className="text-slate-500 text-xs">
                        {translateIndustry(s.Industry)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="text-xs bg-[#9D00FF] hover:bg-[#b347ff] disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
                        >
                          {saving ? "..." : "Kaydet"}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded hover:bg-slate-700 transition-colors"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => startEdit(s)}
                          className="text-xs text-slate-500 hover:text-[#b347ff] px-2 py-1 rounded hover:bg-slate-700 transition-colors"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(s.Ticker)}
                          className="text-xs text-slate-600 hover:text-red-400 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
                        >
                          Override Sil
                        </button>
                      </div>
                    )}
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
    </main>
  );
}
