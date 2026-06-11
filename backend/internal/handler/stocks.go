package handler

import (
	"encoding/json"
	"net/http"

	"github.com/hikmetkutuk/finlenz/backend/internal/repository"
)

type StocksHandler struct {
	repo *repository.StockRepository
}

func NewStocksHandler(repo *repository.StockRepository) *StocksHandler {
	return &StocksHandler{repo: repo}
}

func (h *StocksHandler) List(w http.ResponseWriter, r *http.Request) {
	sector := r.URL.Query().Get("sector")

	stocks, err := h.repo.List(r.Context(), sector)
	if err != nil {
		writeError(w, "failed to fetch stocks", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stocks)
}

func (h *StocksHandler) Sectors(w http.ResponseWriter, r *http.Request) {
	sectors, err := h.repo.Sectors(r.Context())
	if err != nil {
		writeError(w, "failed to fetch sectors", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sectors)
}
