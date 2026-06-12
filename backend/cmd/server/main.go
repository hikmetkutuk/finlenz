package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/hikmetkutuk/finlenz/backend/internal/client"
	"github.com/hikmetkutuk/finlenz/backend/internal/db"
	"github.com/hikmetkutuk/finlenz/backend/internal/handler"
	"github.com/hikmetkutuk/finlenz/backend/internal/middleware"
	"github.com/hikmetkutuk/finlenz/backend/internal/repository"
	"github.com/hikmetkutuk/finlenz/backend/internal/service"
)

func main() {
	ctx := context.Background()
	adminAPIKey := os.Getenv("ADMIN_API_KEY")
	if adminAPIKey == "" {
		log.Fatal("ADMIN_API_KEY environment variable is required")
	}

	pool, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	tvClient := client.NewTradingViewClient()
	stockRepo := repository.NewStockRepository(pool)
	syncSvc := service.NewSyncService(tvClient, stockRepo)

	go syncSvc.Run(ctx)

	yf := client.NewYahooFinanceClient()
	stockHandler := handler.NewStockHandler(yf)
	stocksHandler := handler.NewStocksHandler(stockRepo)
	adminHandler := handler.NewAdminHandler(stockRepo)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/compare", stockHandler.Compare)
	mux.HandleFunc("/api/stocks", stocksHandler.List)
	mux.HandleFunc("/api/sectors", stocksHandler.Sectors)
	adminRoutes := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPut:
			adminHandler.UpsertOverride(w, r)
		case http.MethodDelete:
			adminHandler.DeleteOverride(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.Handle("/api/admin/overrides/", middleware.APIKey(adminAPIKey, adminRoutes))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"status":"ok"}`))
	})

	log.Println("Backend running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", middleware.CORS(mux)); err != nil {
		log.Fatal(err)
	}
}
