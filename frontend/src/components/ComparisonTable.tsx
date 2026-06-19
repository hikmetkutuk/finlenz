import { useEffect, useState, type CSSProperties } from "react";
import { fetchPiotroskiScore } from "../lib/api";
import type { PiotroskiScore, StockData } from "../lib/types";
import {
  formatLargeNumber,
  formatMultiple,
  formatPercent,
  formatRatio,
} from "../lib/utils";

interface Props {
  readonly stocks: StockData[];
}

type BetterDirection = "lower" | "higher" | "none";

interface MetricRow {
  label: string;
  key: keyof StockData;
  format: (v: number | undefined, currency: string) => string;
  better: BetterDirection;
}

const SECTIONS: { title: string; rows: MetricRow[] }[] = [
  {
    title: "DEĞERLEME",
    rows: [
      {
        label: "F/K Oranı",
        key: "peRatio",
        format: (v) => formatRatio(v),
        better: "lower",
      },
      {
        label: "PD/DD Oranı",
        key: "pbRatio",
        format: (v) => formatRatio(v),
        better: "lower",
      },
      {
        label: "FD/FAVÖK",
        key: "evToEBITDA",
        format: (v) => formatMultiple(v),
        better: "lower",
      },
      {
        label: "Piyasa Değeri",
        key: "marketCap",
        format: (v, c) => formatLargeNumber(v, c),
        better: "none",
      },
    ],
  },
  {
    title: "BÜYÜME",
    rows: [
      {
        label: "Hasılat (Son 12 Ay)",
        key: "revenueTTM",
        format: (v, c) => formatLargeNumber(v, c),
        better: "higher",
      },
      {
        label: "Hasılat Büyümesi",
        key: "revenueYoYPct",
        format: (v) => formatPercent(v),
        better: "higher",
      },
      {
        label: "FAVÖK",
        key: "ebitda",
        format: (v, c) => formatLargeNumber(v, c),
        better: "higher",
      },
      {
        label: "Net Kâr",
        key: "netIncome",
        format: (v, c) => formatLargeNumber(v, c),
        better: "higher",
      },
    ],
  },
  {
    title: "KÂRLILIK",
    rows: [
      {
        label: "Brüt Kâr Marjı",
        key: "grossMargin",
        format: (v) => formatPercent(v),
        better: "higher",
      },
      {
        label: "FAVÖK Marjı",
        key: "ebitdaMargin",
        format: (v) => formatPercent(v),
        better: "higher",
      },
      {
        label: "Net Kâr Marjı",
        key: "netMargin",
        format: (v) => formatPercent(v),
        better: "higher",
      },
      {
        label: "Özkaynak Karlılığı",
        key: "roe",
        format: (v) => formatPercent(v),
        better: "higher",
      },
      {
        label: "Aktif Karlılık",
        key: "roa",
        format: (v) => formatPercent(v),
        better: "higher",
      },
      {
        label: "ROIC",
        key: "roic",
        format: (v) => formatPercent(v),
        better: "higher",
      },
    ],
  },
  {
    title: "BORÇLULUK",
    rows: [
      {
        label: "Cari Oran",
        key: "currentRatio",
        format: (v) => formatRatio(v),
        better: "higher",
      },
      {
        label: "Borç / Özsermaye",
        key: "debtToEquity",
        format: (v) => formatRatio(v),
        better: "lower",
      },
      {
        label: "Net Borç / FAVÖK",
        key: "netDebtToEBITDA",
        format: (v) => formatRatio(v),
        better: "lower",
      },
    ],
  },
];

// bestValues returns, for a set of values and a direction, the winning value
// (min for "lower", max for "higher", undefined for "none"/empty input).
function bestValue(
  values: (number | undefined)[],
  direction: BetterDirection,
): number | undefined {
  const defined = values.filter((v): v is number => v != null);
  if (direction === "none" || defined.length < 2) return undefined;
  return direction === "lower" ? Math.min(...defined) : Math.max(...defined);
}

function gridStyle(count: number): CSSProperties {
  return { gridTemplateColumns: `minmax(8rem, 1fr) repeat(${count}, 1fr)` };
}

// loadPiotroskiFor fetches the score for one ticker and reports the result
// via onSettled, unless isCancelled() has become true in the meantime.
// Extracted to module scope to keep nesting shallow inside the effect.
function loadPiotroskiFor(
  ticker: string,
  onSettled: (ticker: string, score: PiotroskiScore | null) => void,
  isCancelled: () => boolean,
): void {
  const bareTicker = ticker.split(".")[0];
  fetchPiotroskiScore(bareTicker)
    .then((score) => {
      if (!isCancelled()) onSettled(ticker, score);
    })
    .catch(() => {
      if (!isCancelled()) onSettled(ticker, null);
    });
}

export default function ComparisonTable({ stocks }: Props) {
  const style = gridStyle(stocks.length);
  const [piotroski, setPiotroski] = useState<
    Record<string, PiotroskiScore | null>
  >({});

  useEffect(() => {
    let cancelled = false;
    setPiotroski({});
    const onSettled = (ticker: string, score: PiotroskiScore | null) => {
      setPiotroski((prev) => ({ ...prev, [ticker]: score }));
    };
    stocks.forEach((s) =>
      loadPiotroskiFor(s.ticker, onSettled, () => cancelled),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks.map((s) => s.ticker).join(",")]);

  const piotroskiValues = stocks.map((s) => piotroski[s.ticker]?.score);
  const bestPiotroski = bestValue(piotroskiValues, "higher");

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
      {/* Header */}
      <div className="grid gap-4 p-6 border-b border-slate-700" style={style}>
        <div />
        {stocks.map((s) => {
          const positive = s.percentChange >= 0;
          return (
            <div key={s.ticker} className="text-center">
              <div className="text-xl font-bold text-[#b347ff]">
                {s.ticker.split(".")[0]}
              </div>
              <div className="text-xs text-slate-400 mt-1 truncate">
                {s.companyName.toUpperCase()}
              </div>
              <div className="text-lg font-semibold mt-2">
                {s.currentPrice.toLocaleString("tr-TR", {
                  minimumFractionDigits: 2,
                })}{" "}
                ₺
              </div>
              <div
                className={`text-sm mt-1 ${positive ? "text-green-400" : "text-red-400"}`}
              >
                {positive ? "+" : ""}
                {s.percentChange.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Piotroski F-Score */}
      <div>
        <div className="px-6 py-3 text-xs font-semibold tracking-widest text-slate-500 bg-slate-800/50">
          FAALİYET KALİTESİ
        </div>
        <div
          className="grid gap-4 px-6 py-3 border-t border-slate-800 hover:bg-slate-800/30 transition-colors items-center"
          style={style}
        >
          <div className="text-sm text-slate-300">Piotroski F-Score</div>
          {stocks.map((s) => {
            const score = piotroski[s.ticker];
            const isBest =
              bestPiotroski != null && score?.score === bestPiotroski;
            if (score === undefined) {
              return (
                <div
                  key={s.ticker}
                  className="text-sm text-center text-slate-600"
                >
                  ...
                </div>
              );
            }
            if (score === null) {
              return (
                <div
                  key={s.ticker}
                  className="text-sm text-center text-slate-600"
                >
                  N/A
                </div>
              );
            }
            return (
              <div
                key={s.ticker}
                className={`text-sm text-center font-medium ${isBest ? "text-green-400" : "text-slate-200"}`}
              >
                {score.score}/{score.maxScore}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="px-6 py-3 text-xs font-semibold tracking-widest text-slate-500 bg-slate-800/50">
            {section.title}
          </div>
          {section.rows.map((row) => {
            const values = stocks.map((s) => s[row.key] as number | undefined);
            const best = bestValue(values, row.better);
            return (
              <div
                key={row.key}
                className="grid gap-4 px-6 py-3 border-t border-slate-800 hover:bg-slate-800/30 transition-colors items-center"
                style={style}
              >
                <div className="text-sm text-slate-300">{row.label}</div>
                {stocks.map((s, i) => {
                  const v = values[i];
                  const isBest = best != null && v === best;
                  return (
                    <div
                      key={s.ticker}
                      className={`text-sm text-center font-medium ${isBest ? "text-green-400" : "text-slate-200"}`}
                    >
                      {row.format(v, s.currency)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
