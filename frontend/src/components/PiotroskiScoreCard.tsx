import { useEffect, useState } from "react";
import { fetchPiotroskiScore } from "../lib/api";
import type { PiotroskiScore } from "../lib/types";

const STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

type CardStatus = (typeof STATUS)[keyof typeof STATUS];

function scoreColor(score: number, maxScore: number): string {
  const ratio = score / maxScore;
  if (ratio >= 0.78) return "text-green-400"; // 7-9
  if (ratio >= 0.45) return "text-yellow-400"; // 4-6
  return "text-red-400"; // 0-3
}

interface Props {
  readonly ticker: string;
}

export default function PiotroskiScoreCard({ ticker }: Props) {
  const [status, setStatus] = useState<CardStatus>(STATUS.LOADING);
  const [data, setData] = useState<PiotroskiScore | null>(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setStatus(STATUS.LOADING);
    fetchPiotroskiScore(ticker)
      .then((score) => {
        if (cancelled) return;
        setData(score);
        setStatus(STATUS.SUCCESS);
      })
      .catch(() => {
        if (!cancelled) setStatus(STATUS.ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (status === STATUS.LOADING) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-slate-400 text-xs uppercase tracking-widest font-medium mb-3">
          Piotroski F-Score
        </h3>
        <p className="text-slate-500 text-sm">Hesaplanıyor...</p>
      </div>
    );
  }

  if (status === STATUS.ERROR || data == null) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-slate-400 text-xs uppercase tracking-widest font-medium mb-3">
          Piotroski F-Score
        </h3>
        <p className="text-slate-500 text-sm">
          Yetersiz finansal veri (en az 2 yıllık bilanço gerekli)
        </p>
      </div>
    );
  }

  const color = scoreColor(data.score, data.maxScore);

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-400 text-xs uppercase tracking-widest font-medium">
          Piotroski F-Score
        </h3>
        {data.fiscalYear && (
          <span className="text-slate-600 text-xs">{data.fiscalYear}</span>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className={`text-3xl font-bold ${color}`}>{data.score}</span>
        <span className="text-slate-500 text-sm">/ {data.maxScore}</span>
      </div>

      <ul className="space-y-1.5">
        {data.criteria.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-sm">
            <span className={c.pass ? "text-green-400" : "text-slate-600"}>
              {c.pass ? "✓" : "✕"}
            </span>
            <span className={c.pass ? "text-slate-300" : "text-slate-500"}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
