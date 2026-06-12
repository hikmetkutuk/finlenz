package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAPIKey(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		configuredKey string
		authorization string
		wantStatus    int
	}{
		{
			name:          "valid bearer token",
			configuredKey: "secret",
			authorization: "Bearer secret",
			wantStatus:    http.StatusNoContent,
		},
		{
			name:          "missing authorization",
			configuredKey: "secret",
			wantStatus:    http.StatusUnauthorized,
		},
		{
			name:          "wrong token",
			configuredKey: "secret",
			authorization: "Bearer wrong",
			wantStatus:    http.StatusUnauthorized,
		},
		{
			name:          "wrong scheme",
			configuredKey: "secret",
			authorization: "Basic secret",
			wantStatus:    http.StatusUnauthorized,
		},
		{
			name:          "missing configured key fails closed",
			authorization: "Bearer secret",
			wantStatus:    http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusNoContent)
			})
			request := httptest.NewRequest(http.MethodPut, "/api/admin/overrides/KRONT", nil)
			request.Header.Set("Authorization", tt.authorization)
			response := httptest.NewRecorder()

			APIKey(tt.configuredKey, next).ServeHTTP(response, request)

			if response.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, tt.wantStatus)
			}
		})
	}
}
