import { useReducer, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchComparison } from "../lib/api";
import type { StockData } from "../lib/types";
import ComparisonTable from "../components/ComparisonTable";
import StockPicker from "../components/StockPicker";

const MIN_STOCKS = 2;
const MAX_STOCKS = 4;
const SLOT_PARAMS = ["s1", "s2", "s3", "s4"];

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
} as const;

type State =
  | { status: typeof STATUS.IDLE }
  | { status: typeof STATUS.LOADING }
  | { status: typeof STATUS.SUCCESS; stocks: StockData[]; warning?: string }
  | { status: typeof STATUS.ERROR; message: string };

const ACTION = {
  START: "start",
  SUCCESS: "success",
  ERROR: "error",
} as const;

type Action =
  | { type: typeof ACTION.START }
  | { type: typeof ACTION.SUCCESS; stocks: StockData[]; warning?: string }
  | { type: typeof ACTION.ERROR; message: string };

function reducer(_: State, action: Action): State {
  switch (action.type) {
    case ACTION.START:
      return { status: STATUS.LOADING };
    case ACTION.SUCCESS:
      return {
        status: STATUS.SUCCESS,
        stocks: action.stocks,
        warning: action.warning,
      };
    case ACTION.ERROR:
      return { status: STATUS.ERROR, message: action.message };
  }
}

interface Slot {
  id: number;
  ticker: string;
}

function tickersFromParams(params: URLSearchParams): string[] {
  return SLOT_PARAMS.map((key) => params.get(key) ?? "").filter(Boolean);
}

function makeSlots(tickers: string[], nextId: () => number): Slot[] {
  return tickers.map((ticker) => ({ id: nextId(), ticker }));
}

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTickers = tickersFromParams(searchParams);
  const nextSlotId = useRef(0);
  const newSlotId = useCallback(() => nextSlotId.current++, []);

  const [slots, setSlots] = useState<Slot[]>(() =>
    makeSlots(
      urlTickers.length >= MIN_STOCKS
        ? urlTickers
        : [...urlTickers, "", ""].slice(0, MIN_STOCKS),
      newSlotId,
    ),
  );
  const [state, dispatch] = useReducer(reducer, { status: STATUS.IDLE });
  const abortRef = useRef<AbortController | null>(null);

  const compare = useCallback((list: string[], signal: AbortSignal) => {
    fetchComparison(
      list.map((t) => `${t}.IS`),
      signal,
    )
      .then((resp) => {
        if (signal.aborted) return;
        if (resp.data.length < MIN_STOCKS) {
          dispatch({
            type: ACTION.ERROR,
            message: resp.error || "Veriler yüklenemedi",
          });
        } else {
          dispatch({
            type: ACTION.SUCCESS,
            stocks: resp.data,
            warning: resp.error ?? undefined,
          });
        }
      })
      .catch((e: unknown) => {
        if (signal.aborted) return;
        dispatch({
          type: ACTION.ERROR,
          message: e instanceof Error ? e.message : "Bir hata oluştu",
        });
      });
  }, []);

  useEffect(() => {
    if (urlTickers.length < MIN_STOCKS) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: ACTION.START });
    compare(urlTickers, controller.signal);
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, compare]);

  function setTickerAt(id: number, value: string) {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, ticker: value } : slot)),
    );
  }

  function addSlot() {
    if (slots.length >= MAX_STOCKS) return;
    setSlots((prev) => [...prev, { id: newSlotId(), ticker: "" }]);
  }

  function removeSlot(id: number) {
    if (slots.length <= MIN_STOCKS) return;
    setSlots((prev) => prev.filter((slot) => slot.id !== id));
  }

  function handleCompare() {
    const filled = slots.map((s) => s.ticker).filter(Boolean);
    if (filled.length < MIN_STOCKS) return;
    const params: Record<string, string> = {};
    filled.forEach((t, i) => {
      params[SLOT_PARAMS[i]] = t;
    });
    setSearchParams(params);
  }

  const canAdd = slots.length < MAX_STOCKS;
  const canRemove = slots.length > MIN_STOCKS;
  const filledCount = slots.filter((s) => s.ticker).length;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-semibold text-white mb-6">
        Hisse Karşılaştırma
      </h2>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="flex items-stretch gap-3 flex-wrap lg:flex-nowrap">
          {slots.map((slot, i) => (
            <div
              key={slot.id}
              className="flex items-stretch gap-3 flex-1 min-w-48"
            >
              <div className="relative flex-1">
                {canRemove && (
                  <button
                    onClick={() => removeSlot(slot.id)}
                    aria-label="Hisseyi kaldır"
                    className="absolute -top-2 -right-2 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white text-xs transition-colors"
                  >
                    ✕
                  </button>
                )}
                <StockPicker
                  label={`${i + 1}. Hisse`}
                  value={slot.ticker}
                  onChange={(v) => setTickerAt(slot.id, v)}
                />
              </div>
              {i < slots.length - 1 && (
                <div className="flex items-center text-slate-600 font-medium text-xs pt-5">
                  VS
                </div>
              )}
            </div>
          ))}

          {canAdd && (
            <button
              onClick={addSlot}
              className="border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 rounded-lg flex flex-col items-center justify-center gap-1 min-w-32 px-4 transition-colors"
            >
              <span className="text-xl leading-none">+</span>
              <span className="text-xs whitespace-nowrap">Hisse Ekle</span>
            </button>
          )}
        </div>

        <button
          onClick={handleCompare}
          disabled={state.status === STATUS.LOADING || filledCount < MIN_STOCKS}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {state.status === STATUS.LOADING ? "Yükleniyor..." : "Karşılaştır"}
        </button>
      </div>

      {state.status === STATUS.ERROR && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
          {state.message}
        </div>
      )}

      {state.status === STATUS.SUCCESS && (
        <>
          {state.warning && (
            <div className="bg-yellow-900/20 border border-yellow-800 text-yellow-400 rounded-lg px-4 py-3 mb-6 text-sm">
              Bazı hisseler yüklenemedi: {state.warning}
            </div>
          )}
          <ComparisonTable stocks={state.stocks} />
        </>
      )}
    </main>
  );
}
