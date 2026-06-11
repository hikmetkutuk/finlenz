package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/hikmetkutuk/finlenz/backend/internal/client"
)

type StockRepository struct {
	db *pgxpool.Pool
}

func NewStockRepository(db *pgxpool.Pool) *StockRepository {
	return &StockRepository{db: db}
}

func (r *StockRepository) UpsertAll(ctx context.Context, stocks []client.Stock) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Collect tickers from current sync
	tickers := make([]string, 0, len(stocks))
	for _, s := range stocks {
		tickers = append(tickers, s.Ticker)
	}

	// Upsert all fetched stocks
	for _, s := range stocks {
		_, err := tx.Exec(ctx, `
			INSERT INTO stocks (ticker, name, sector, industry, exchange, updated_at)
			VALUES ($1, $2, $3, $4, 'IST', NOW())
			ON CONFLICT (ticker) DO UPDATE
			SET name       = EXCLUDED.name,
			    sector     = EXCLUDED.sector,
			    industry   = EXCLUDED.industry,
			    updated_at = NOW()
		`, s.Ticker, s.Name, s.Sector, s.Industry)
		if err != nil {
			return err
		}
	}

	// Delete tickers no longer present in TradingView
	_, err = tx.Exec(ctx, `
		DELETE FROM stocks WHERE ticker != ALL($1)
	`, tickers)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *StockRepository) Count(ctx context.Context) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, "SELECT COUNT(*) FROM stocks").Scan(&count)
	return count, err
}
