package domain_test

import (
	"errors"
	"testing"

	"go-api/internal/domain"
)

func TestErrorConstructors_MatchOnlyTheirOwnKind(t *testing.T) {
	t.Parallel()
	kinds := []error{domain.ErrInvalidMatrix, domain.ErrNonFiniteResult, domain.ErrUpstreamUnavailable}
	tests := []struct {
		name string
		err  error
		kind error
	}{
		{"invalid matrix", domain.NewInvalidMatrixError("bad"), domain.ErrInvalidMatrix},
		{"non-finite result", domain.NewNonFiniteResultError("bad"), domain.ErrNonFiniteResult},
		{"upstream unavailable", domain.NewUpstreamUnavailableError("bad"), domain.ErrUpstreamUnavailable},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			for _, k := range kinds {
				if got, want := errors.Is(tt.err, k), k == tt.kind; got != want {
					t.Errorf("errors.Is(err, %v) = %v, want %v", k, got, want)
				}
			}
		})
	}
}

func TestErrorConstructors_Error_ReturnsDetailNotKind(t *testing.T) {
	t.Parallel()
	if got := domain.NewInvalidMatrixError("row 2 is short").Error(); got != "row 2 is short" {
		t.Fatalf("Error() = %q, want the detail", got)
	}
}

func TestErrorConstructors_WrappedWithFmt_StillMatchesKind(t *testing.T) {
	t.Parallel()
	wrapped := errors.Join(errors.New("context"), domain.NewNonFiniteResultError("overflow"))
	if !errors.Is(wrapped, domain.ErrNonFiniteResult) {
		t.Fatal("kind must survive wrapping")
	}
}
