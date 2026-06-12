import { useReducer, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchComparison } from "../lib/api";
import type { StockData } from "../lib/types";
import ComparisonTable from "../components/ComparisonTable";
import StockPicker from "../components/StockPicker";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; stocks: StockData[] }
  | { status: "error"; message: string };

type Action =
  | { type: "start" }
  | { type: "success"; stocks: StockData[] }
  | { type: "error"; message: string };

function reducer(_: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { status: "loading" };
    case "success":
      return { status: "success", stocks: action.stocks };
    case "error":
      return { status: "error", message: action.message };
  }
}

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlS1 = searchParams.get("s1") ?? "";
  const urlS2 = searchParams.get("s2") ?? "";

  const [ticker1, setTicker1] = useState(urlS1);
  const [ticker2, setTicker2] = useState(urlS2);
  const [state, dispatch] = useReducer(reducer, { status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const compare = useCallback((t1: string, t2: string, signal: AbortSignal) => {
    fetchComparison(t1 + ".IS", t2 + ".IS", signal)
      .then((resp) => {
        if (signal.aborted) return;
        if (resp.data.length < 2) {
          dispatch({
            type: "error",
            message: resp.error || "Veriler yüklenemedi",
          });
        } else {
          dispatch({ type: "success", stocks: resp.data });
        }
      })
      .catch((e: unknown) => {
        if (signal.aborted) return;
        dispatch({
          type: "error",
          message: e instanceof Error ? e.message : "Bir hata oluştu",
        });
      });
  }, []);

  useEffect(() => {
    if (!urlS1 || !urlS2) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "start" });
    compare(urlS1, urlS2, controller.signal);
    return () => {
      controller.abort();
    };
  }, [urlS1, urlS2, compare]);

  function handleCompare() {
    if (!ticker1 || !ticker2) return;
    setSearchParams({ s1: ticker1, s2: ticker2 });
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white mb-1">
          Hisse Karşılaştırma
        </h2>
        <p className="text-slate-400 text-sm">
          İki BIST hissesini finansal metriklerle karşılaştır
        </p>
      </div>

      <div className="flex gap-4 mb-6 items-start">
        <div className="flex-1 min-w-0">
          <StockPicker label="1. Hisse" value={ticker1} onChange={setTicker1} />
        </div>
        <div className="flex items-center pt-8 text-slate-600 font-medium text-sm shrink-0">
          VS
        </div>
        <div className="flex-1 min-w-0">
          <StockPicker label="2. Hisse" value={ticker2} onChange={setTicker2} />
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={state.status === "loading" || !ticker1 || !ticker2}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors mb-8 text-sm"
      >
        {state.status === "loading" ? "Yükleniyor..." : "Karşılaştır"}
      </button>

      {state.status === "error" && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
          {state.message}
        </div>
      )}

      {state.status === "success" && <ComparisonTable stocks={state.stocks} />}
    </main>
  );
}
