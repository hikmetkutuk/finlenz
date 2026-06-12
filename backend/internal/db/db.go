package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS stocks (
			id         SERIAL PRIMARY KEY,
			ticker     VARCHAR(20)  UNIQUE NOT NULL,
			name       VARCHAR(255) NOT NULL,
			sector     VARCHAR(100),
			industry   VARCHAR(100),
			exchange   VARCHAR(20)  NOT NULL DEFAULT 'IST',
			updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_stocks_sector   ON stocks(sector);
		CREATE INDEX IF NOT EXISTS idx_stocks_industry ON stocks(industry);

		CREATE TABLE IF NOT EXISTS stock_overrides (
			ticker   VARCHAR(20) PRIMARY KEY,
			sector   VARCHAR(100),
			industry VARCHAR(100)
		);
	`)
	return err
}
