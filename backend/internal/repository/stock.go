package repository

import (
	"context"
	"fmt"

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

	tickers := make([]string, 0, len(stocks))
	for _, s := range stocks {
		tickers = append(tickers, s.Ticker)
	}

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

	_, err = tx.Exec(ctx, `DELETE FROM stocks WHERE ticker != ALL($1)`, tickers)
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

type StockRow struct {
	Ticker   string
	Name     string
	Sector   string
	Industry string
}

func (r *StockRepository) List(ctx context.Context, sector string) ([]StockRow, error) {
	// Initialize as non-nil so JSON encodes as [] not null
	rows := make([]StockRow, 0)

	var query string
	var args []interface{}
	if sector != "" {
		query = `SELECT ticker, name, sector, industry FROM stocks WHERE sector = $1 ORDER BY ticker`
		args = []interface{}{sector}
	} else {
		query = `SELECT ticker, name, sector, industry FROM stocks ORDER BY ticker`
	}

	result, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return rows, err
	}
	defer result.Close()

	for result.Next() {
		var s StockRow
		if err := result.Scan(&s.Ticker, &s.Name, &s.Sector, &s.Industry); err != nil {
			return rows, err
		}
		rows = append(rows, s)
	}

	if err := result.Err(); err != nil {
		return rows, err
	}

	return rows, nil
}

type Override struct {
	Sector   string
	Industry string
}

func (r *StockRepository) GetOverrides(ctx context.Context) (map[string]Override, error) {
	result, err := r.db.Query(ctx, `SELECT ticker, sector, industry FROM stock_overrides`)
	if err != nil {
		return nil, fmt.Errorf("query overrides: %w", err)
	}
	defer result.Close()

	overrides := make(map[string]Override)
	for result.Next() {
		var ticker string
		var sector, industry *string // nullable columns
		if err := result.Scan(&ticker, &sector, &industry); err != nil {
			return nil, fmt.Errorf("scan override row: %w", err)
		}
		ov := Override{}
		if sector != nil {
			ov.Sector = *sector
		}
		if industry != nil {
			ov.Industry = *industry
		}
		overrides[ticker] = ov
	}
	if err := result.Err(); err != nil {
		return nil, fmt.Errorf("iterate overrides: %w", err)
	}
	return overrides, nil
}

func (r *StockRepository) Sectors(ctx context.Context) ([]string, error) {
	// Initialize as non-nil so JSON encodes as [] not null
	sectors := make([]string, 0)

	result, err := r.db.Query(ctx,
		`SELECT DISTINCT sector FROM stocks WHERE sector != '' ORDER BY sector`,
	)
	if err != nil {
		return sectors, err
	}
	defer result.Close()

	for result.Next() {
		var s string
		if err := result.Scan(&s); err != nil {
			return sectors, err
		}
		sectors = append(sectors, s)
	}

	if err := result.Err(); err != nil {
		return sectors, err
	}

	return sectors, nil
}
