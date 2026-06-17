package service

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/hikmetkutuk/finlenz/backend/internal/client"
	"github.com/hikmetkutuk/finlenz/backend/internal/model"
	"github.com/hikmetkutuk/finlenz/backend/internal/repository"
)

const (
	sectorAvgRefreshInterval = time.Hour
	sectorAvgStartupDelay    = 2 * time.Minute
	sectorAvgConcurrency     = 5
)

// SectorAveragesService computes and caches sector-level metric averages.
// It runs a background goroutine that refreshes every hour.
type SectorAveragesService struct {
	repo     *repository.StockRepository
	yfClient *client.YahooFinanceClient
	mu       sync.RWMutex
	data     map[string]*model.SectorAverages
}

func NewSectorAveragesService(
	repo *repository.StockRepository,
	yf *client.YahooFinanceClient,
) *SectorAveragesService {
	return &SectorAveragesService{
		repo:     repo,
		yfClient: yf,
		data:     make(map[string]*model.SectorAverages),
	}
}

// Get returns sector averages for the given sector, or nil if not yet computed.
func (s *SectorAveragesService) Get(sector string) *model.SectorAverages {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.data[sector]
}

// Run starts the background computation loop. Blocks until ctx is cancelled.
func (s *SectorAveragesService) Run(ctx context.Context) {
	// Delay startup so the Yahoo session can be established by normal traffic first.
	select {
	case <-time.After(sectorAvgStartupDelay):
	case <-ctx.Done():
		return
	}

	for {
		s.refresh(ctx)
		select {
		case <-time.After(sectorAvgRefreshInterval):
		case <-ctx.Done():
			return
		}
	}
}

func (s *SectorAveragesService) refresh(ctx context.Context) {
	log.Println("sector averages: starting refresh")

	sectors, err := s.repo.Sectors(ctx)
	if err != nil {
		log.Printf("sector averages: failed to list sectors: %v", err)
		return
	}

	for _, sector := range sectors {
		if ctx.Err() != nil {
			return
		}
		avg, err := s.computeSector(ctx, sector)
		if err != nil {
			log.Printf("sector averages: compute %q failed: %v", sector, err)
			continue
		}
		s.mu.Lock()
		s.data[sector] = avg
		s.mu.Unlock()
		log.Printf("sector averages: %q → %d stocks", sector, avg.StockCount)
	}

	log.Println("sector averages: refresh complete")
}

// appendIfSet appends the dereferenced value of ptr to slice when ptr is non-nil.
func appendIfSet(slice []float64, ptr *float64) []float64 {
	if ptr != nil {
		return append(slice, *ptr)
	}
	return slice
}

// collectMetrics accumulates per-metric samples from a stock data point.
type metricAccumulator struct {
	pe, pb, ev                     []float64
	gross, ebitdaM, netM, roe, roa []float64
	currRatio, d2e, netDebt        []float64
}

func (a *metricAccumulator) add(d *model.StockData) {
	a.pe = appendIfSet(a.pe, d.PERatio)
	a.pb = appendIfSet(a.pb, d.PBRatio)
	a.ev = appendIfSet(a.ev, d.EVToEBITDA)
	a.gross = appendIfSet(a.gross, d.GrossMargin)
	a.ebitdaM = appendIfSet(a.ebitdaM, d.EBITDAMargin)
	a.netM = appendIfSet(a.netM, d.NetMargin)
	a.roe = appendIfSet(a.roe, d.ROE)
	a.roa = appendIfSet(a.roa, d.ROA)
	a.currRatio = appendIfSet(a.currRatio, d.CurrentRatio)
	a.d2e = appendIfSet(a.d2e, d.DebtToEquity)
	a.netDebt = appendIfSet(a.netDebt, d.NetDebtToEBITDA)
}

func (s *SectorAveragesService) computeSector(ctx context.Context, sector string) (*model.SectorAverages, error) {
	rows, err := s.repo.List(ctx, sector)
	if err != nil {
		return nil, err
	}

	type result struct {
		data *model.StockData
	}

	results := make(chan result, len(rows))
	sem := make(chan struct{}, sectorAvgConcurrency)

	var wg sync.WaitGroup
	for _, row := range rows {
		wg.Add(1)
		go func(ticker string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			if ctx.Err() != nil {
				return
			}
			data, fetchErr := s.yfClient.GetStockData(ticker + ".IS")
			if fetchErr != nil {
				return
			}
			results <- result{data: data}
		}(row.Ticker)
	}

	wg.Wait()
	close(results)

	var acc metricAccumulator
	for res := range results {
		acc.add(res.data)
	}

	return &model.SectorAverages{
		Sector:          sector,
		StockCount:      len(rows),
		PERatio:         meanPtr(acc.pe),
		PBRatio:         meanPtr(acc.pb),
		EVToEBITDA:      meanPtr(acc.ev),
		GrossMargin:     meanPtr(acc.gross),
		EBITDAMargin:    meanPtr(acc.ebitdaM),
		NetMargin:       meanPtr(acc.netM),
		ROE:             meanPtr(acc.roe),
		ROA:             meanPtr(acc.roa),
		CurrentRatio:    meanPtr(acc.currRatio),
		DebtToEquity:    meanPtr(acc.d2e),
		NetDebtToEBITDA: meanPtr(acc.netDebt),
	}, nil
}

func meanPtr(vals []float64) *float64 {
	if len(vals) == 0 {
		return nil
	}
	sum := 0.0
	for _, v := range vals {
		sum += v
	}
	v := sum / float64(len(vals))
	return &v
}
