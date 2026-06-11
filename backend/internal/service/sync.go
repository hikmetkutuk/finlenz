package service

import (
	"context"
	"log"

	"github.com/hikmetkutuk/finlenz/backend/internal/client"
	"github.com/hikmetkutuk/finlenz/backend/internal/repository"
)

type SyncService struct {
	tv   *client.TradingViewClient
	repo *repository.StockRepository
}

func NewSyncService(tv *client.TradingViewClient, repo *repository.StockRepository) *SyncService {
	return &SyncService{tv: tv, repo: repo}
}

func (s *SyncService) Run(ctx context.Context) {
	if err := s.sync(ctx); err != nil {
		log.Printf("initial stock sync failed: %v", err)
	}
}

func (s *SyncService) sync(ctx context.Context) error {
	log.Println("syncing BIST stocks from TradingView...")

	stocks, err := s.tv.FetchAllStocks()
	if err != nil {
		return err
	}

	if err := s.repo.UpsertAll(ctx, stocks); err != nil {
		return err
	}

	count, _ := s.repo.Count(ctx)
	log.Printf("stock sync complete: %d stocks in database", count)
	return nil
}
