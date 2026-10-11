package application_test

import (
	"context"
	"errors"
	"math"
	"testing"

	"go-api/internal/application"
	"go-api/internal/domain"
)

type fakeFactorizer struct {
	result domain.Factorization
	err    error
	calls  int
	got    domain.Matrix
}

func (f *fakeFactorizer) Factorize(m domain.Matrix) (domain.Factorization, error) {
	f.calls++
	f.got = m
	return f.result, f.err
}

type fakeStatistics struct {
	result domain.Statistics
	err    error
	calls  int
	got    domain.Matrices
	ctx    context.Context
}

func (s *fakeStatistics) Calculate(ctx context.Context, m domain.Matrices) (domain.Statistics, error) {
	s.calls++
	s.got = m
	s.ctx = ctx
	return s.result, s.err
}

var (
	input     = [][]float64{{1, 2}, {3, 4}}
	fakeQ     = domain.Matrix{{0, 1}, {1, 0}}
	fakeR     = domain.Matrix{{3, 4}, {0, 2}}
	fakeStats = domain.Statistics{
		Max: 4, Min: 0, Average: 1.5, Sum: 12,
		IsDiagonal:  domain.DiagonalFlags{Original: false, Q: false, R: false},
		AnyDiagonal: false,
	}
)

func newUseCase() (*application.FactorizeMatrix, *fakeFactorizer, *fakeStatistics) {
	f := &fakeFactorizer{result: domain.Factorization{Q: fakeQ, R: fakeR}}
	s := &fakeStatistics{result: fakeStats}
	return application.NewFactorizeMatrix(f, s), f, s
}

func TestExecute_ValidMatrix_ReturnsOriginalQRAndStatistics(t *testing.T) {
	t.Parallel()
	uc, _, _ := newUseCase()

	res, err := uc.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(res.Original) != 2 || res.Original[1][1] != 4 {
		t.Errorf("Original = %v, want the input matrix", res.Original)
	}
	if res.Q[0][1] != 1 || res.R[1][1] != 2 {
		t.Errorf("Q/R = %v / %v, want the factorizer output", res.Q, res.R)
	}
	if res.Statistics != fakeStats {
		t.Errorf("Statistics = %+v, want %+v", res.Statistics, fakeStats)
	}
}

func TestExecute_ValidMatrix_PassesOriginalQAndRToStatisticsClient(t *testing.T) {
	t.Parallel()
	uc, f, s := newUseCase()
	type ctxKey struct{}
	ctx := context.WithValue(context.Background(), ctxKey{}, "marker")

	if _, err := uc.Execute(ctx, input); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.calls != 1 {
		t.Fatalf("statistics calls = %d, want 1", s.calls)
	}
	if s.got.Original[0][0] != 1 || s.got.Original[1][1] != 4 {
		t.Errorf("Original sent to statistics = %v", s.got.Original)
	}
	if s.got.Q[0][1] != 1 || s.got.R[0][0] != 3 {
		t.Errorf("Q/R sent to statistics = %v / %v", s.got.Q, s.got.R)
	}
	if s.ctx.Value(ctxKey{}) != "marker" {
		t.Error("request context was not forwarded to the statistics client")
	}
	if f.got.Rows() != 2 || f.got.Cols() != 2 {
		t.Errorf("factorizer received %dx%d, want 2x2", f.got.Rows(), f.got.Cols())
	}
}

func TestExecute_InvalidMatrix_FailsBeforeCallingAnyPort(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		rows [][]float64
	}{
		{"nil", nil},
		{"empty row", [][]float64{{}}},
		{"ragged", [][]float64{{1, 2}, {3}}},
		{"NaN", [][]float64{{math.NaN()}}},
		{"Inf", [][]float64{{math.Inf(1)}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			uc, f, s := newUseCase()
			_, err := uc.Execute(context.Background(), tt.rows)
			if !errors.Is(err, domain.ErrInvalidMatrix) {
				t.Fatalf("err = %v, want ErrInvalidMatrix", err)
			}
			if f.calls != 0 || s.calls != 0 {
				t.Fatalf("ports called (factorizer=%d, statistics=%d), want none", f.calls, s.calls)
			}
		})
	}
}

func TestExecute_FactorizerError_PropagatesWithoutCallingStatistics(t *testing.T) {
	t.Parallel()
	uc, f, s := newUseCase()
	boom := errors.New("gonum qr failed")
	f.err = boom

	_, err := uc.Execute(context.Background(), input)
	if !errors.Is(err, boom) {
		t.Fatalf("err = %v, want the factorizer error", err)
	}
	if s.calls != 0 {
		t.Fatalf("statistics calls = %d, want 0", s.calls)
	}
}

func TestExecute_NonFiniteFactorization_ReturnsNonFiniteResultError(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		q, r domain.Matrix
	}{
		{"Inf in Q", domain.Matrix{{math.Inf(1)}}, domain.Matrix{{1}}},
		{"NaN in Q", domain.Matrix{{math.NaN()}}, domain.Matrix{{1}}},
		{"Inf in R", domain.Matrix{{1}}, domain.Matrix{{math.Inf(-1)}}},
		{"NaN in R", domain.Matrix{{1}}, domain.Matrix{{math.NaN()}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			uc, f, s := newUseCase()
			f.result = domain.Factorization{Q: tt.q, R: tt.r}

			_, err := uc.Execute(context.Background(), [][]float64{{1}})
			if !errors.Is(err, domain.ErrNonFiniteResult) {
				t.Fatalf("err = %v, want ErrNonFiniteResult", err)
			}
			if s.calls != 0 {
				t.Fatalf("statistics calls = %d, want 0 (never send non-finite values upstream)", s.calls)
			}
		})
	}
}

func TestExecute_StatisticsError_PropagatesAsUpstreamUnavailable(t *testing.T) {
	t.Parallel()
	uc, _, s := newUseCase()
	s.err = domain.NewUpstreamUnavailableError("call node-api: connection refused")

	res, err := uc.Execute(context.Background(), input)
	if !errors.Is(err, domain.ErrUpstreamUnavailable) {
		t.Fatalf("err = %v, want ErrUpstreamUnavailable", err)
	}
	if res.Q != nil || res.R != nil || res.Original != nil {
		t.Fatalf("result = %+v, want zero value on error", res)
	}
}
