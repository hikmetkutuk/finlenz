package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/hikmetkutuk/finlenz/backend/internal/client"
	"github.com/hikmetkutuk/finlenz/backend/internal/model"
)

type StockHandler struct {
	client *client.YahooFinanceClient
}

func NewStockHandler(c *client.YahooFinanceClient) *StockHandler {
	return &StockHandler{client: c}
}

func (h *StockHandler) Compare(w http.ResponseWriter, r *http.Request) {
	symbolsParam := r.URL.Query().Get("symbols")
	if symbolsParam == "" {
		writeError(w, "symbols query param required", http.StatusBadRequest)
		return
	}

	symbols := strings.Split(symbolsParam, ",")
	if len(symbols) != 2 {
		writeError(w, "exactly 2 symbols required", http.StatusBadRequest)
		return
	}

	type result struct {
		data *model.StockData
		err  error
	}

	results := make([]result, 2)
	var wg sync.WaitGroup

	for i, sym := range symbols {
		wg.Add(1)
		go func(idx int, symbol string) {
			defer wg.Done()
			data, err := h.client.GetStockData(strings.TrimSpace(symbol))
			results[idx] = result{data: data, err: err}
		}(i, sym)
	}

	wg.Wait()

	resp := &model.CompareResponse{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Data:      make([]*model.StockData, 0, 2),
	}

	var errs []string
	for _, r := range results {
		if r.err != nil {
			errs = append(errs, r.err.Error())
		} else {
			resp.Data = append(resp.Data, r.data)
		}
	}

	if len(errs) > 0 {
		errMsg := strings.Join(errs, "; ")
		resp.Error = &errMsg
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func writeError(w http.ResponseWriter, msg string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
