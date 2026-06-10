package main

import (
	"log"
	"net/http"

	"github.com/hikmetkutuk/finlenz/backend/internal/client"
	"github.com/hikmetkutuk/finlenz/backend/internal/handler"
	"github.com/hikmetkutuk/finlenz/backend/internal/middleware"
)

func main() {
	yf := client.NewYahooFinanceClient()
	stockHandler := handler.NewStockHandler(yf)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/compare", stockHandler.Compare)
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})

	log.Println("Backend running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", middleware.CORS(mux)); err != nil {
		log.Fatal(err)
	}
}
