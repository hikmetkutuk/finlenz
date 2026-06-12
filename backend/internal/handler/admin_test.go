package handler

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

type adminRepositoryStub struct {
	upsertCalls int
	sector      string
	industry    string
}

func (s *adminRepositoryStub) UpsertOverride(_ context.Context, _, sector, industry string) error {
	s.upsertCalls++
	s.sector = sector
	s.industry = industry
	return nil
}

func (s *adminRepositoryStub) DeleteOverride(context.Context, string) error {
	return nil
}

func TestAdminHandlerUpsertOverrideValidation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCalls  int
		wantSector string
		wantInd    string
	}{
		{
			name:       "blank sector",
			body:       `{"sector":"  ","industry":"Software"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "blank industry",
			body:       `{"sector":"Technology","industry":"  "}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid fields are trimmed",
			body:       `{"sector":" Technology ","industry":" Software "}`,
			wantStatus: http.StatusOK,
			wantCalls:  1,
			wantSector: "Technology",
			wantInd:    "Software",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := &adminRepositoryStub{}
			request := httptest.NewRequest(
				http.MethodPut,
				"/api/admin/overrides/KRONT",
				bytes.NewBufferString(tt.body),
			)
			response := httptest.NewRecorder()

			NewAdminHandler(repo).UpsertOverride(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, tt.wantStatus)
			}
			if repo.upsertCalls != tt.wantCalls {
				t.Fatalf("upsert calls = %d, want %d", repo.upsertCalls, tt.wantCalls)
			}
			if repo.sector != tt.wantSector || repo.industry != tt.wantInd {
				t.Fatalf(
					"saved fields = (%q, %q), want (%q, %q)",
					repo.sector,
					repo.industry,
					tt.wantSector,
					tt.wantInd,
				)
			}
		})
	}
}
