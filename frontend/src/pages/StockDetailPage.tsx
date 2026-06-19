import { useEffect, useReducer, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  fetchStockDetail,
  fetchSectorAverages,
  saveOverride,
} from "../lib/api";
import type { SectorAverages, StockDetail } from "../lib/types";
import PriceChart from "../components/PriceChart";
import BacktestSection from "../components/BacktestSection";
import PiotroskiScoreCard from "../components/PiotroskiScoreCard";
import {
  formatPrice,
  formatLargeNumber,
  formatPercent,
  formatMultiple,
  translateSector,
  translateIndustry,
} from "../lib/utils";

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

const ACTION = {
  FETCH: "fetch",
  SUCCESS: "success",
  ERROR: "error",
} as const;

const HIGHLIGHT = {
  POSITIVE: "positive",
  NEGATIVE: "negative",
  NEUTRAL: "neutral",
} as const;

type Highlight = (typeof HIGHLIGHT)[keyof typeof HIGHLIGHT];

type State =
  | { status: typeof STATUS.IDLE }
  | { status: typeof STATUS.LOADING }
  | { status: typeof STATUS.SUCCESS; data: StockDetail }
  | { status: typeof STATUS.ERROR; message: string };

type Action =
  | { type: typeof ACTION.FETCH }
  | { type: typeof ACTION.SUCCESS; data: StockDetail }
  | { type: typeof ACTION.ERROR; message: string };

function reducer(_: State, action: Action): State {
  switch (action.type) {
    case ACTION.FETCH:
      return { status: STATUS.LOADING };
    case ACTION.SUCCESS:
      return { status: STATUS.SUCCESS, data: action.data };
    case ACTION.ERROR:
      return { status: STATUS.ERROR, message: action.message };
  }
}

interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly highlight?: Highlight;
  readonly sectorAvg?: string;
}

const HIGHLIGHT_COLOR: Record<Highlight, string> = {
  [HIGHLIGHT.POSITIVE]: "text-green-400",
  [HIGHLIGHT.NEGATIVE]: "text-red-400",
  [HIGHLIGHT.NEUTRAL]: "text-white",
};

function MetricCard({
  label,
  value,
  sub,
  highlight,
  sectorAvg,
}: MetricCardProps) {
  const valueColor =
    highlight == null ? "text-white" : HIGHLIGHT_COLOR[highlight];

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-lg font-semibold ${valueColor}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
      {sectorAvg && (
        <p className="text-slate-600 text-xs mt-1">Sektör ort. {sectorAvg}</p>
      )}
    </div>
  );
}

function signHighlight(value: number | undefined): Highlight {
  if (value == null) return HIGHLIGHT.NEUTRAL;
  return value >= 0 ? HIGHLIGHT.POSITIVE : HIGHLIGHT.NEGATIVE;
}

function sectionTitle(title: string) {
  return (
    <h3 className="text-slate-400 text-xs uppercase tracking-widest font-medium mb-3 mt-6">
      {title}
    </h3>
  );
}

// fmtAvg formats a sector average value for display, returning undefined when absent.
// Uses positive null-check (== null) to satisfy S7735 (no negated conditions).
function fmtAvg(
  value: number | null | undefined,
  fn: (v: number) => string,
): string | undefined {
  if (value == null) return undefined;
  return fn(value);
}

const SECTOR_AVG_MAX_RETRIES = 5;
const SECTOR_AVG_RETRY_MS = 30_000;

// pollSectorAverages retries fetching sector averages until data is available
// or the maximum attempt count is reached. Handles the backend 2-minute warmup.
function pollSectorAverages(
  sector: string,
  onSuccess: (avg: SectorAverages) => void,
  isCancelled: () => boolean,
  attempt = 0,
): void {
  if (isCancelled()) return;
  fetchSectorAverages(sector)
    .then((avg) => {
      if (isCancelled()) return;
      if (avg !== null) {
        onSuccess(avg);
      } else if (attempt < SECTOR_AVG_MAX_RETRIES) {
        setTimeout(
          () => pollSectorAverages(sector, onSuccess, isCancelled, attempt + 1),
          SECTOR_AVG_RETRY_MS,
        );
      }
    })
    .catch(() => {});
}

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, { status: STATUS.IDLE });
  const [sectorAvg, setSectorAvg] = useState<SectorAverages | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSector, setEditSector] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    // P2: clear stale sector averages immediately when ticker changes
    setSectorAvg(null);
    dispatch({ type: ACTION.FETCH });
    fetchStockDetail(ticker)
      .then((data) => {
        if (cancelled) return;
        dispatch({ type: ACTION.SUCCESS, data });
        pollSectorAverages(
          data.sector,
          (avg) => setSectorAvg(avg),
          () => cancelled,
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
          dispatch({ type: ACTION.ERROR, message: msg });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (state.status === STATUS.IDLE || state.status === STATUS.LOADING) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-slate-400 text-sm">Yükleniyor...</div>
      </main>
    );
  }

  if (state.status === STATUS.ERROR) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-red-400 mb-4">{state.message}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-slate-400 hover:text-white underline"
        >
          Geri dön
        </button>
      </main>
    );
  }

  const d = state.data;
  const changePositive = d.percentChange >= 0;

  function startEdit() {
    setEditSector(d.sector);
    setEditIndustry(d.industry);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function handleSave() {
    if (!ticker) return;
    setSaving(true);
    try {
      await saveOverride(ticker, editSector, editIndustry);
      dispatch({
        type: ACTION.SUCCESS,
        data: { ...d, sector: editSector, industry: editIndustry },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-slate-300 transition-colors">
          Hisseler
        </Link>
        <span>/</span>
        <span className="text-slate-300">{ticker}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold text-white">{ticker}</h2>
            <p className="text-slate-400 mt-1">{d.companyName}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">
              {formatPrice(d.currentPrice, d.currency)}
            </p>
            <p
              className={`text-sm font-medium mt-1 ${changePositive ? "text-green-400" : "text-red-400"}`}
            >
              {changePositive ? "▲" : "▼"}{" "}
              {Math.abs(d.percentChange).toFixed(2)}%
            </p>
          </div>
        </div>

        {editing ? (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <input
              value={editSector}
              onChange={(e) => setEditSector(e.target.value)}
              placeholder="Sektör"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#b347ff] w-40"
            />
            <input
              value={editIndustry}
              onChange={(e) => setEditIndustry(e.target.value)}
              placeholder="Endüstri"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#b347ff] w-48"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              {saving ? "..." : "✓ Kaydet"}
            </button>
            <button
              onClick={cancelEdit}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              İptal
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-block bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-sm font-medium">
                {translateSector(d.sector)}
              </span>
              {d.industry && (
                <span className="inline-block text-slate-400 text-sm">
                  • {translateIndustry(d.industry)}
                </span>
              )}
              {saved && (
                <span className="text-sm text-green-400 font-medium">
                  ✓ Kaydedildi
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={`/compare?s1=${ticker}`}
                className="text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
              >
                Karşılaştır
              </Link>
              <button
                onClick={startEdit}
                className="bg-[#9D00FF] hover:bg-[#b347ff] text-white px-4 py-1.5 rounded-lg font-medium text-sm transition-colors flex items-center gap-1"
              >
                ✎ Düzenle
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fiyat Grafiği */}
      <div className="mb-8">
        <PriceChart ticker={ticker ?? ""} />
      </div>

      {/* Piotroski F-Score */}
      <div className="mb-8">
        <PiotroskiScoreCard ticker={ticker ?? ""} />
      </div>

      {/* Değerleme */}
      {sectionTitle("Değerleme")}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="F/K Oranı"
          value={formatMultiple(d.peRatio)}
          sectorAvg={fmtAvg(sectorAvg?.peRatio, formatMultiple)}
        />
        <MetricCard
          label="PD/DD"
          value={formatMultiple(d.pbRatio)}
          sectorAvg={fmtAvg(sectorAvg?.pbRatio, formatMultiple)}
        />
        <MetricCard
          label="FD/FAVÖK"
          value={formatMultiple(d.evToEBITDA)}
          sectorAvg={fmtAvg(sectorAvg?.evToEBITDA, formatMultiple)}
        />
        <MetricCard
          label="Piyasa Değeri"
          value={formatLargeNumber(d.marketCap, d.currency)}
        />
      </div>

      {/* Büyüme */}
      {sectionTitle("Büyüme")}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Hasılat (Son 12 Ay)"
          value={formatLargeNumber(d.revenueTTM, d.currency)}
        />
        <MetricCard
          label="Hasılat Büyümesi"
          value={formatPercent(d.revenueYoYPct)}
          highlight={signHighlight(d.revenueYoYPct)}
        />
        <MetricCard
          label="FAVÖK"
          value={formatLargeNumber(d.ebitda, d.currency)}
        />
        <MetricCard
          label="Net Kâr"
          value={formatLargeNumber(d.netIncome, d.currency)}
        />
      </div>

      {/* Kârlılık */}
      {sectionTitle("Kârlılık")}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Brüt Kâr Marjı"
          value={formatPercent(d.grossMargin)}
          highlight={signHighlight(d.grossMargin)}
          sectorAvg={fmtAvg(sectorAvg?.grossMargin, formatPercent)}
        />
        <MetricCard
          label="FAVÖK Marjı"
          value={formatPercent(d.ebitdaMargin)}
          highlight={signHighlight(d.ebitdaMargin)}
          sectorAvg={fmtAvg(sectorAvg?.ebitdaMargin, formatPercent)}
        />
        <MetricCard
          label="Net Kâr Marjı"
          value={formatPercent(d.netMargin)}
          highlight={signHighlight(d.netMargin)}
          sectorAvg={fmtAvg(sectorAvg?.netMargin, formatPercent)}
        />
        <MetricCard
          label="Özkaynak Karlılığı"
          value={formatPercent(d.roe)}
          highlight={signHighlight(d.roe)}
          sectorAvg={fmtAvg(sectorAvg?.roe, formatPercent)}
        />
        <MetricCard
          label="Aktif Karlılık"
          value={formatPercent(d.roa)}
          highlight={signHighlight(d.roa)}
          sectorAvg={fmtAvg(sectorAvg?.roa, formatPercent)}
        />
        <MetricCard
          label="ROIC"
          value={formatPercent(d.roic)}
          highlight={signHighlight(d.roic)}
        />
      </div>

      {/* Borçluluk */}
      {sectionTitle("Borçluluk")}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Cari Oran"
          value={formatMultiple(d.currentRatio)}
          highlight={signHighlight(d.currentRatio)}
          sectorAvg={fmtAvg(sectorAvg?.currentRatio, formatMultiple)}
        />
        <MetricCard
          label="Borç / Özsermaye"
          value={formatMultiple(d.debtToEquity)}
          sectorAvg={fmtAvg(sectorAvg?.debtToEquity, formatMultiple)}
        />
        <MetricCard
          label="Net Borç / FAVÖK"
          value={formatMultiple(d.netDebtToEBITDA)}
          sectorAvg={fmtAvg(sectorAvg?.netDebtToEBITDA, formatMultiple)}
        />
      </div>

      {/* Yatırım Simülasyonu */}
      <div className="mt-8">
        <BacktestSection ticker={ticker ?? ""} currency={d.currency} />
      </div>
    </main>
  );
}
