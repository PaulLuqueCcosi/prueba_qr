package nodeapi_test

import (
	"context"
	"errors"
	"io"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"go-api/internal/adapters/outbound/nodeapi"
	"go-api/internal/application"
	"go-api/internal/domain"
)

const okBody = `{"max":167,"min":-68,"average":3.5,"sum":42,"isDiagonal":{"original":false,"q":true,"r":false},"anyDiagonal":true}`

var sampleMatrices = domain.Matrices{
	Original: domain.Matrix{{1, 2}, {3, 4}},
	Q:        domain.Matrix{{0, 1}, {1, 0}},
	R:        domain.Matrix{{3, 4}, {0, 2}},
}

func newClient(t *testing.T, baseURL string, timeout time.Duration) *nodeapi.StatisticsClient {
	t.Helper()
	c, err := nodeapi.NewStatisticsClient(baseURL, timeout)
	if err != nil {
		t.Fatalf("NewStatisticsClient: %v", err)
	}
	return c
}

func fakeNode(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	return srv
}

func respondWith(status int, body string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = io.WriteString(w, body)
	}
}

func assertUpstreamUnavailable(t *testing.T, err error) {
	t.Helper()
	if !errors.Is(err, domain.ErrUpstreamUnavailable) {
		t.Fatalf("err = %v, want ErrUpstreamUnavailable", err)
	}
}

func TestCalculate_SuccessfulResponse_DecodesTypedStatistics(t *testing.T) {
	t.Parallel()
	srv := fakeNode(t, respondWith(http.StatusOK, okBody))

	got, err := newClient(t, srv.URL, time.Second).Calculate(context.Background(), sampleMatrices)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := domain.Statistics{
		Max: 167, Min: -68, Average: 3.5, Sum: 42,
		IsDiagonal:  domain.DiagonalFlags{Original: false, Q: true, R: false},
		AnyDiagonal: true,
	}
	if got != want {
		t.Fatalf("statistics = %+v, want %+v", got, want)
	}
}

func TestCalculate_Request_IsPostJSONToStatisticsEndpointWithExactBodyShape(t *testing.T) {
	t.Parallel()
	var method, path, contentType string
	var raw []byte
	srv := fakeNode(t, func(w http.ResponseWriter, r *http.Request) {
		method, path, contentType = r.Method, r.URL.Path, r.Header.Get("Content-Type")
		raw, _ = io.ReadAll(r.Body)
		respondWith(http.StatusOK, okBody)(w, r)
	})

	if _, err := newClient(t, srv.URL, time.Second).Calculate(context.Background(), sampleMatrices); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if method != http.MethodPost {
		t.Errorf("method = %s, want POST", method)
	}
	if path != "/api/v1/statistics" {
		t.Errorf("path = %s, want /api/v1/statistics", path)
	}
	if !strings.HasPrefix(contentType, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", contentType)
	}
	want := `{"matrices":{"original":[[1,2],[3,4]],"q":[[0,1],[1,0]],"r":[[3,4],[0,2]]}}`
	if string(raw) != want {
		t.Errorf("body = %s, want %s", raw, want)
	}
}

func TestCalculate_BaseURLWithTrailingSlash_StillHitsStatisticsEndpoint(t *testing.T) {
	t.Parallel()
	var path string
	srv := fakeNode(t, func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		respondWith(http.StatusOK, okBody)(w, r)
	})

	if _, err := newClient(t, srv.URL+"/", time.Second).Calculate(context.Background(), sampleMatrices); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if path != "/api/v1/statistics" {
		t.Fatalf("path = %s, want /api/v1/statistics", path)
	}
}

func TestCalculate_NonSuccessStatus_ReturnsUpstreamUnavailable(t *testing.T) {
	t.Parallel()
	for _, status := range []int{http.StatusBadRequest, http.StatusUnprocessableEntity, http.StatusInternalServerError, http.StatusBadGateway, http.StatusUnauthorized} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			t.Parallel()
			srv := fakeNode(t, respondWith(status, `{"error":{"code":"X","message":"secret internal stack"}}`))

			_, err := newClient(t, srv.URL, time.Second).Calculate(context.Background(), sampleMatrices)
			assertUpstreamUnavailable(t, err)
			if strings.Contains(err.Error(), "secret internal stack") {
				t.Errorf("upstream body leaked into the error: %v", err)
			}
		})
	}
}

func TestCalculate_MalformedJSONResponse_ReturnsUpstreamUnavailable(t *testing.T) {
	t.Parallel()
	for name, body := range map[string]string{
		"not json":       `<html>oops</html>`,
		"truncated json": `{"max": 1,`,
		"empty body":     ``,
		"wrong types":    `{"max":"high"}`,
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			srv := fakeNode(t, respondWith(http.StatusOK, body))

			_, err := newClient(t, srv.URL, time.Second).Calculate(context.Background(), sampleMatrices)
			assertUpstreamUnavailable(t, err)
		})
	}
}

func TestCalculate_SlowUpstream_FailsWithinTimeoutAsUpstreamUnavailable(t *testing.T) {
	t.Parallel()
	release := make(chan struct{})
	srv := fakeNode(t, func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-release:
		case <-r.Context().Done():
		}
	})
	// Unblock the handler first so srv.Close does not wait for it.
	t.Cleanup(func() { close(release) })

	start := time.Now()
	_, err := newClient(t, srv.URL, 50*time.Millisecond).Calculate(context.Background(), sampleMatrices)
	elapsed := time.Since(start)

	assertUpstreamUnavailable(t, err)
	if elapsed > 2*time.Second {
		t.Fatalf("call took %v, want it bounded by the 50ms timeout", elapsed)
	}
}

func TestCalculate_CancelledContext_ReturnsUpstreamUnavailable(t *testing.T) {
	t.Parallel()
	srv := fakeNode(t, respondWith(http.StatusOK, okBody))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := newClient(t, srv.URL, time.Second).Calculate(ctx, sampleMatrices)
	assertUpstreamUnavailable(t, err)
}

func TestCalculate_ConnectionRefused_ReturnsUpstreamUnavailable(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.NotFoundHandler())
	url := srv.URL
	srv.Close() // the ephemeral port is now closed

	_, err := newClient(t, url, time.Second).Calculate(context.Background(), sampleMatrices)
	assertUpstreamUnavailable(t, err)
}

func TestCalculate_UnencodableMatrix_ReturnsUpstreamUnavailable(t *testing.T) {
	t.Parallel()
	srv := fakeNode(t, respondWith(http.StatusOK, okBody))
	nan := domain.Matrix{{math.NaN()}}

	_, err := newClient(t, srv.URL, time.Second).Calculate(context.Background(), domain.Matrices{Original: nan, Q: nan, R: nan})
	assertUpstreamUnavailable(t, err)
}

func TestNewStatisticsClient_InvalidBaseURL_ReturnsError(t *testing.T) {
	t.Parallel()
	if _, err := nodeapi.NewStatisticsClient("http://[::1", time.Second); err == nil {
		t.Fatal("expected an error for an unparsable base URL")
	}
}

func TestCalculate_TokenInContext_IsForwardedAsBearerAuthorization(t *testing.T) {
	t.Parallel()
	var got []string
	srv := fakeNode(t, func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Values("Authorization")
		respondWith(http.StatusOK, okBody)(w, r)
	})
	ctx := application.WithAccessToken(context.Background(), "caller.jwt.token")

	if _, err := newClient(t, srv.URL, time.Second).Calculate(ctx, sampleMatrices); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(got) != 1 || got[0] != "Bearer caller.jwt.token" {
		t.Fatalf("Authorization = %v, want exactly [Bearer caller.jwt.token]", got)
	}
}

func TestCalculate_NoTokenInContext_SendsNoAuthorization(t *testing.T) {
	t.Parallel()
	var got string
	srv := fakeNode(t, func(w http.ResponseWriter, r *http.Request) {
		got = r.Header.Get("Authorization")
		respondWith(http.StatusOK, okBody)(w, r)
	})

	if _, err := newClient(t, srv.URL, time.Second).Calculate(context.Background(), sampleMatrices); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got != "" {
		t.Fatalf("Authorization = %q, want none", got)
	}
}

func TestCalculate_RejectedToken_ReturnsUpstreamUnavailableWithoutTokenOrBodyInError(t *testing.T) {
	t.Parallel()
	for _, status := range []int{http.StatusUnauthorized, http.StatusForbidden} {
		srv := fakeNode(t, respondWith(status, `{"error":{"message":"UPSTREAM-SECRET"}}`))
		ctx := application.WithAccessToken(context.Background(), "caller.jwt.token")

		_, err := newClient(t, srv.URL, time.Second).Calculate(ctx, sampleMatrices)

		assertUpstreamUnavailable(t, err)
		if msg := err.Error(); strings.Contains(msg, "caller.jwt.token") || strings.Contains(msg, "UPSTREAM-SECRET") {
			t.Errorf("status %d: error leaks token or body: %q", status, msg)
		}
	}
}
