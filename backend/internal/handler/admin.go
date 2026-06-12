package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
)

type AdminHandler struct {
	repo adminRepository
}

type adminRepository interface {
	UpsertOverride(ctx context.Context, ticker, sector, industry string) error
	DeleteOverride(ctx context.Context, ticker string) error
}

func NewAdminHandler(repo adminRepository) *AdminHandler {
	return &AdminHandler{repo: repo}
}

type overrideRequest struct {
	Sector   string `json:"sector"`
	Industry string `json:"industry"`
}

func (h *AdminHandler) UpsertOverride(w http.ResponseWriter, r *http.Request) {
	ticker := strings.TrimPrefix(r.URL.Path, "/api/admin/overrides/")
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	if ticker == "" {
		writeError(w, "ticker required", http.StatusBadRequest)
		return
	}

	var req overrideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Sector = strings.TrimSpace(req.Sector)
	req.Industry = strings.TrimSpace(req.Industry)
	if req.Sector == "" || req.Industry == "" {
		writeError(w, "sector and industry are required", http.StatusBadRequest)
		return
	}

	if err := h.repo.UpsertOverride(r.Context(), ticker, req.Sector, req.Industry); err != nil {
		writeError(w, "failed to save override", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *AdminHandler) DeleteOverride(w http.ResponseWriter, r *http.Request) {
	ticker := strings.TrimPrefix(r.URL.Path, "/api/admin/overrides/")
	ticker = strings.ToUpper(strings.TrimSpace(ticker))
	if ticker == "" {
		writeError(w, "ticker required", http.StatusBadRequest)
		return
	}

	if err := h.repo.DeleteOverride(r.Context(), ticker); err != nil {
		writeError(w, "failed to delete override", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
