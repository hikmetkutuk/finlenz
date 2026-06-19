import { useEffect, useMemo, useState } from "react";
import { fetchStockHistory } from "../lib/api";
import type { HistoryPoint } from "../lib/types";

const RANGES = [
  { value: "1mo", label: "1A" },
  { value: "3mo", label: "3A" },
  { value: "6mo", label: "6A" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

const STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

type ChartStatus = (typeof STATUS)[keyof typeof STATUS];

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const CHART_PADDING = 8;

function buildPath(points: HistoryPoint[]): {
  linePath: string;
  areaPath: string;
} {
  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const usableWidth = CHART_WIDTH - CHART_PADDING * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;

  const coords = points.map((p, i) => {
    const x =
      CHART_PADDING + (i / Math.max(points.length - 1, 1)) * usableWidth;
    const y =
      CHART_PADDING + usableHeight - ((p.close - min) / range) * usableHeight;
    return [x, y];
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const firstX = coords[0]?.[0] ?? CHART_PADDING;
  const lastX = coords.at(-1)?.[0] ?? CHART_WIDTH - CHART_PADDING;
  const baseline = CHART_HEIGHT - CHART_PADDING;
  const areaPath = `${linePath} L${lastX.toFixed(2)},${baseline} L${firstX.toFixed(2)},${baseline} Z`;

  return { linePath, areaPath };
}

interface Props {
  readonly ticker: string;
}

export default function PriceChart({ ticker }: Props) {
  const [range, setRange] = useState<RangeValue>("3mo");
  const [status, setStatus] = useState<ChartStatus>(STATUS.LOADING);
  const [points, setPoints] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    setStatus(STATUS.LOADING);
    fetchStockHistory(ticker, range)
      .then((data) => {
        if (cancelled) return;
        setPoints(data);
        setStatus(STATUS.SUCCESS);
      })
      .catch(() => {
        if (!cancelled) setStatus(STATUS.ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, range]);

  const { linePath, areaPath } = useMemo(
    () =>
      points.length > 0 ? buildPath(points) : { linePath: "", areaPath: "" },
    [points],
  );

  const trendUp =
    points.length > 1 &&
    (points.at(-1)?.close ?? 0) >= (points.at(0)?.close ?? 0);
  const lineColor = trendUp ? "#4ade80" : "#f87171";

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-400 text-xs uppercase tracking-widest font-medium">
          Fiyat Grafiği
        </h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                range === r.value
                  ? "bg-[#9D00FF] text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {status === STATUS.LOADING && (
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
          Yükleniyor...
        </div>
      )}

      {status === STATUS.ERROR && (
        <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
          Grafik verisi alınamadı
        </div>
      )}

      {status === STATUS.SUCCESS && points.length > 0 && (
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full h-[200px]"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="priceChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#priceChartFill)" stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  );
}
