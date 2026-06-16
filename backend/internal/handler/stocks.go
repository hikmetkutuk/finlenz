package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/hikmetkutuk/finlenz/backend/internal/client"
	"github.com/hikmetkutuk/finlenz/backend/internal/model"
	"github.com/hikmetkutuk/finlenz/backend/internal/repository"
)

const (
	contentTypeHeader = "Content-Type"
	contentTypeJSON   = "application/json"
)

type StocksHandler struct {
	repo     *repository.StockRepository
	yfClient *client.YahooFinanceClient
}

func NewStocksHandler(repo *repository.StockRepository, yf *client.YahooFinanceClient) *StocksHandler {
	return &StocksHandler{repo: repo, yfClient: yf}
}

func (h *StocksHandler) List(w http.ResponseWriter, r *http.Request) {
	sector := r.URL.Query().Get("sector")

	stocks, err := h.repo.List(r.Context(), sector)
	if err != nil {
		writeError(w, "failed to fetch stocks", http.StatusInternalServerError)
		return
	}

	w.Header().Set(contentTypeHeader, contentTypeJSON)
	if err := json.NewEncoder(w).Encode(stocks); err != nil {
		log.Printf("stocks list encode error: %v", err)
	}
}

func (h *StocksHandler) Sectors(w http.ResponseWriter, r *http.Request) {
	sectors, err := h.repo.Sectors(r.Context())
	if err != nil {
		writeError(w, "failed to fetch sectors", http.StatusInternalServerError)
		return
	}

	w.Header().Set(contentTypeHeader, contentTypeJSON)
	if err := json.NewEncoder(w).Encode(sectors); err != nil {
		log.Printf("sectors encode error: %v", err)
	}
}

func (h *StocksHandler) Detail(w http.ResponseWriter, r *http.Request) {
	ticker := strings.TrimPrefix(r.URL.Path, "/api/stocks/")
	ticker = strings.TrimSpace(ticker)
	if ticker == "" {
		writeError(w, "ticker required", http.StatusBadRequest)
		return
	}

	row, err := h.repo.GetByTicker(r.Context(), ticker)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, fmt.Sprintf("stock %s not found", ticker), http.StatusNotFound)
		} else {
			log.Printf("GetByTicker %s: %v", ticker, err)
			writeError(w, "failed to fetch stock", http.StatusInternalServerError)
		}
		return
	}

	yfSymbol := ticker + ".IS"
	stockData, err := h.yfClient.GetStockData(yfSymbol)
	if err != nil {
		writeError(w, fmt.Sprintf("failed to fetch market data: %v", err), http.StatusBadGateway)
		return
	}

	resp := &model.StockDetailResponse{
		StockData: stockData,
		Sector:    row.Sector,
		Industry:  row.Industry,
	}

	w.Header().Set(contentTypeHeader, contentTypeJSON)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("detail encode error for %s: %v", ticker, err)
	}
}

// History handles GET /api/stocks/{ticker}/history?range=1mo
func (h *StocksHandler) History(w http.ResponseWriter, r *http.Request) {
	ticker := strings.TrimSpace(r.PathValue("ticker"))
	if ticker == "" {
		writeError(w, "ticker required", http.StatusBadRequest)
		return
	}

	rangeParam := r.URL.Query().Get("range")
	if rangeParam == "" {
		rangeParam = "3mo"
	}

	yfSymbol := ticker + ".IS"
	points, err := h.yfClient.GetHistory(yfSymbol, rangeParam)
	if err != nil {
		writeError(w, fmt.Sprintf("failed to fetch history: %v", err), http.StatusBadGateway)
		return
	}

	w.Header().Set(contentTypeHeader, contentTypeJSON)
	if err := json.NewEncoder(w).Encode(points); err != nil {
		log.Printf("history encode error for %s: %v", ticker, err)
	}
}
