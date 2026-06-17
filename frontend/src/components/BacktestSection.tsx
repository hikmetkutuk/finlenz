import { useEffect, useState } from "react";
import { fetchStockHistory } from "../lib/api";
import type { HistoryPoint } from "../lib/types";

const RANGES = [
  { value: "1mo", label: "1 Ay" },
  { value: "3mo", label: "3 Ay" },
  { value: "6mo", label: "6 Ay" },
  { value: "1y", label: "1 Yıl" },
  { value: "5y", label: "5 Yıl" },
] as const;

type RangeValue = (typeof RANGES)[number]["value"];

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

type SimStatus = (typeof STATUS)[keyof typeof STATUS];

interface SimResult {
  startDate: string;
  endDate: string;
  startPrice: number;
  endPrice: number;
  shares: number;
  finalValue: number;
  gain: number;
  gainPct: number;
  annualizedPct: number;
  days: number;
}

function computeSim(amount: number, points: HistoryPoint[]): SimResult | null {
  if (points.length < 2) return null;
  // .at() returns T | undefined; guard here instead of using non-null assertions
  const first = points[0];
  const last = points.at(-1);
  if (first == null || last == null || first.close === 0) return null;

  const shares = amount / first.close;
  const finalValue = shares * last.close;
  const gain = finalValue - amount;
  const gainPct = (gain / amount) * 100;

  const start = new Date(first.date).getTime();
  const end = new Date(last.date).getTime();
  const days = Math.max((end - start) / 86_400_000, 1);
  const annualizedPct = (Math.pow(finalValue / amount, 365 / days) - 1) * 100;

  return {
    startDate: first.date,
    endDate: last.date,
    startPrice: first.close,
    endPrice: last.close,
    shares,
    finalValue,
    gain,
    gainPct,
    annualizedPct,
    days: Math.round(days),
  };
}

function gainColorClass(positive: boolean | null): string {
  if (positive === true) return "text-green-400";
  if (positive === false) return "text-red-400";
  return "text-white";
}

function fmt(n: number): string {
  return n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface Props {
  readonly ticker: string;
  readonly currency: string;
}

export default function BacktestSection({ ticker, currency }: Props) {
  const [range, setRange] = useState<RangeValue>("1y");
  const [amountInput, setAmountInput] = useState("10000");
  const [status, setStatus] = useState<SimStatus>(STATUS.IDLE);
  const [result, setResult] = useState<SimResult | null>(null);

  const currencySymbol = currency === "TRY" ? "₺" : currency;

  useEffect(() => {
    const amount = Number.parseFloat(amountInput.replace(",", "."));
    if (!ticker || Number.isNaN(amount) || amount <= 0) {
      // P3: clear stale result for invalid/empty input
      setResult(null);
      setStatus(STATUS.IDLE);
      return;
    }

    let cancelled = false;
    setStatus(STATUS.LOADING);
    setResult(null);

    fetchStockHistory(ticker, range)
      .then((points) => {
        if (cancelled) return;
        const sim = computeSim(amount, points);
        setResult(sim);
        setStatus(STATUS.SUCCESS);
      })
      .catch(() => {
        if (!cancelled) setStatus(STATUS.ERROR);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker, range, amountInput]);

  const gain = result ? result.gain >= 0 : null;
  const gainColor = gainColorClass(gain);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-slate-400 text-xs uppercase tracking-widest font-medium">
          Yatırım Simülasyonu
        </h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                range === r.value
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-400 text-sm shrink-0">
          Başlangıç yatırımı
        </span>
        <div className="relative">
          <input
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white w-32 focus:outline-none focus:border-blue-400 text-right pr-6"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            {currencySymbol}
          </span>
        </div>
      </div>

      {status === STATUS.LOADING && (
        <p className="text-slate-500 text-sm">Hesaplanıyor...</p>
      )}

      {status === STATUS.ERROR && (
        <p className="text-slate-500 text-sm">Veri alınamadı</p>
      )}

      {status === STATUS.SUCCESS && result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Başlangıç Fiyatı</p>
              <p className="text-white font-semibold text-sm">
                {fmt(result.startPrice)} {currencySymbol}
              </p>
              <p className="text-slate-600 text-xs mt-0.5">
                {result.startDate}
              </p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Güncel Fiyat</p>
              <p className="text-white font-semibold text-sm">
                {fmt(result.endPrice)} {currencySymbol}
              </p>
              <p className="text-slate-600 text-xs mt-0.5">{result.endDate}</p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Güncel Değer</p>
              <p className={`font-semibold text-sm ${gainColor}`}>
                {fmt(result.finalValue)} {currencySymbol}
              </p>
              <p className="text-slate-600 text-xs mt-0.5">
                {fmt(result.shares)} adet
              </p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-slate-500 text-xs mb-1">Getiri</p>
              <p className={`font-semibold text-sm ${gainColor}`}>
                {result.gain >= 0 ? "+" : ""}
                {fmt(result.gain)} {currencySymbol}
              </p>
              <p className={`text-xs mt-0.5 ${gainColor}`}>
                {result.gainPct >= 0 ? "+" : ""}
                {result.gainPct.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
            <span>{result.days} gün</span>
            <span>·</span>
            <span>
              Yıllıklandırılmış getiri:{" "}
              <span className={gainColor}>
                {result.annualizedPct >= 0 ? "+" : ""}
                {result.annualizedPct.toFixed(1)}%
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
