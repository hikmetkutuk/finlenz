import { useEffect, useReducer } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchStockDetail } from "../lib/api";
import type { StockDetail } from "../lib/types";
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
}

const HIGHLIGHT_COLOR: Record<Highlight, string> = {
  [HIGHLIGHT.POSITIVE]: "text-green-400",
  [HIGHLIGHT.NEGATIVE]: "text-red-400",
  [HIGHLIGHT.NEUTRAL]: "text-white",
};

function MetricCard({ label, value, sub, highlight }: MetricCardProps) {
  const valueColor =
    highlight == null ? "text-white" : HIGHLIGHT_COLOR[highlight];

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-lg font-semibold ${valueColor}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
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

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reducer, { status: STATUS.IDLE });

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    dispatch({ type: ACTION.FETCH });
    fetchStockDetail(ticker)
      .then((data) => {
        if (!cancelled) dispatch({ type: ACTION.SUCCESS, data });
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
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">{ticker}</h2>
          <p className="text-slate-400 mt-1">{d.companyName}</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
              {translateSector(d.sector)}
            </span>
            {d.industry && (
              <span className="text-xs text-slate-500">
                {translateIndustry(d.industry)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {formatPrice(d.currentPrice, d.currency)}
          </p>
          <p
            className={`text-sm font-medium mt-1 ${changePositive ? "text-green-400" : "text-red-400"}`}
          >
            {changePositive ? "▲" : "▼"} {Math.abs(d.percentChange).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <Link
          to={`/compare?s1=${ticker}`}
          className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Karşılaştır
        </Link>
        <button
          onClick={() => navigate(-1)}
          className="text-sm border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 px-4 py-2 rounded-lg transition-colors"
        >
          Geri
        </button>
      </div>

      {/* Değerleme */}
      {sectionTitle("Değerleme")}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="F/K Oranı" value={formatMultiple(d.peRatio)} />
        <MetricCard label="PD/DD" value={formatMultiple(d.pbRatio)} />
        <MetricCard label="EV/EBITDA" value={formatMultiple(d.evToEBITDA)} />
        <MetricCard
          label="Piyasa Değeri"
          value={formatLargeNumber(d.marketCap, d.currency)}
        />
      </div>

      {/* Büyüme */}
      {sectionTitle("Büyüme")}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Hasılat (TTM)"
          value={formatLargeNumber(d.revenueTTM, d.currency)}
        />
        <MetricCard
          label="Hasılat YoY"
          value={formatPercent(d.revenueYoYPct)}
          highlight={signHighlight(d.revenueYoYPct)}
        />
        <MetricCard
          label="EBITDA"
          value={formatLargeNumber(d.ebitda, d.currency)}
        />
      </div>

      {/* Kârlılık */}
      {sectionTitle("Kârlılık")}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Net Kâr"
          value={formatLargeNumber(d.netIncome, d.currency)}
        />
        <MetricCard
          label="EBITDA Marjı"
          value={formatPercent(d.ebitdaMargin)}
          highlight={signHighlight(d.ebitdaMargin)}
        />
        <MetricCard
          label="Net Marj"
          value={formatPercent(d.netMargin)}
          highlight={signHighlight(d.netMargin)}
        />
        <MetricCard
          label="ROIC"
          value={formatPercent(d.roic)}
          highlight={signHighlight(d.roic)}
        />
      </div>
    </main>
  );
}
