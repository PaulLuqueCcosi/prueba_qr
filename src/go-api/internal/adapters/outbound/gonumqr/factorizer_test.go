package gonumqr_test

import (
	"math"
	"math/rand/v2"
	"testing"

	"go-api/internal/adapters/outbound/gonumqr"
	"go-api/internal/domain"
)

const tol = 1e-9

// QR signs are implementation-defined, so every test checks mathematical
// properties of the factorization instead of exact values.

func factorize(t *testing.T, a domain.Matrix) domain.Factorization {
	t.Helper()
	f, err := gonumqr.New().Factorize(a)
	if err != nil {
		t.Fatalf("Factorize returned error: %v", err)
	}
	return f
}

func mul(a, b domain.Matrix) domain.Matrix {
	out := make(domain.Matrix, len(a))
	for i := range out {
		out[i] = make([]float64, len(b[0]))
		for k := range b {
			for j := range b[0] {
				out[i][j] += a[i][k] * b[k][j]
			}
		}
	}
	return out
}

func transpose(a domain.Matrix) domain.Matrix {
	out := make(domain.Matrix, len(a[0]))
	for j := range out {
		out[j] = make([]float64, len(a))
		for i := range a {
			out[j][i] = a[i][j]
		}
	}
	return out
}

// assertQR checks the four invariants that define a full QR decomposition.
func assertQR(t *testing.T, a domain.Matrix, f domain.Factorization) {
	t.Helper()
	m, n := a.Rows(), a.Cols()

	if f.Q.Rows() != m || f.Q.Cols() != m {
		t.Fatalf("Q is %dx%d, want %dx%d", f.Q.Rows(), f.Q.Cols(), m, m)
	}
	if f.R.Rows() != m || f.R.Cols() != n {
		t.Fatalf("R is %dx%d, want %dx%d", f.R.Rows(), f.R.Cols(), m, n)
	}

	for i := range f.R {
		for j := 0; j < i && j < n; j++ {
			if math.Abs(f.R[i][j]) > tol {
				t.Errorf("R[%d][%d] = %g, want ~0 below the diagonal", i, j, f.R[i][j])
			}
		}
	}

	qr := mul(f.Q, f.R)
	for i := range a {
		for j := range a[i] {
			if math.Abs(qr[i][j]-a[i][j]) > tol {
				t.Errorf("(Q*R)[%d][%d] = %g, want %g", i, j, qr[i][j], a[i][j])
			}
		}
	}

	qtq := mul(transpose(f.Q), f.Q)
	for i := range qtq {
		for j := range qtq[i] {
			want := 0.0
			if i == j {
				want = 1
			}
			if math.Abs(qtq[i][j]-want) > tol {
				t.Errorf("(QT*Q)[%d][%d] = %g, want %g", i, j, qtq[i][j], want)
			}
		}
	}
}

func randomMatrix(rng *rand.Rand, rows, cols int) domain.Matrix {
	m := make(domain.Matrix, rows)
	for i := range m {
		m[i] = make([]float64, cols)
		for j := range m[i] {
			m[i][j] = rng.Float64()*20 - 10
		}
	}
	return m
}

func TestFactorize_VariousShapes_SatisfiesQRProperties(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		a    domain.Matrix
	}{
		{"1x1", domain.Matrix{{5}}},
		{"1x1 negative", domain.Matrix{{-3.5}}},
		{"square 2x2", domain.Matrix{{1, 2}, {3, 4}}},
		{"square 3x3", domain.Matrix{{12, -51, 4}, {6, 167, -68}, {-4, 24, -41}}},
		{"tall 3x2", domain.Matrix{{1, 2}, {3, 4}, {5, 6}}},
		{"tall Nx1", domain.Matrix{{1}, {2}, {3}, {4}}},
		{"wide 1x3", domain.Matrix{{1, 2, 3}}},
		{"wide 2x3", domain.Matrix{{1, 2, 3}, {4, 5, 6}}},
		{"wide 2x4", domain.Matrix{{1, 2, 3, 4}, {5, 6, 7, 8}}},
		{"wide 3x4", domain.Matrix{{2, -1, 0, 5}, {-1, 2, -1, 3}, {0, -1, 2, -7}}},
		{"negatives and decimals", domain.Matrix{{-1.5, 2.25, 0.125}, {3.75, -0.5, -8.0625}}},
		{"rank deficient square", domain.Matrix{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}},
		{"rank deficient tall", domain.Matrix{{1, 2}, {2, 4}, {3, 6}}},
		{"rank deficient wide", domain.Matrix{{1, 2, 3}, {2, 4, 6}}},
		{"all zeros square", domain.Matrix{{0, 0}, {0, 0}}},
		{"all zeros wide", domain.Matrix{{0, 0, 0}, {0, 0, 0}}},
		{"all zeros tall", domain.Matrix{{0}, {0}, {0}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assertQR(t, tt.a, factorize(t, tt.a))
		})
	}
}

func TestFactorize_ClassicMatrix_HasKnownDiagonalMagnitudes(t *testing.T) {
	t.Parallel()
	a := domain.Matrix{{12, -51, 4}, {6, 167, -68}, {-4, 24, -41}}
	f := factorize(t, a)
	for i, want := range []float64{14, 175, 35} {
		if got := math.Abs(f.R[i][i]); math.Abs(got-want) > 1e-9 {
			t.Errorf("|R[%d][%d]| = %g, want %g", i, i, got, want)
		}
	}
}

// Regression guard for the wide-matrix strategy: Gonum only factorizes
// rows >= cols, so the tail columns of R must come from Q^T * A2. If that step
// is dropped the tail is zero and Q*R no longer reconstructs A.
func TestFactorize_WideMatrix_ReconstructsOriginal(t *testing.T) {
	t.Parallel()
	a := domain.Matrix{{1, 2, 3, 4}, {5, 6, 7, 8}}
	f := factorize(t, a)

	tail := mul(transpose(f.Q), domain.Matrix{{3, 4}, {7, 8}})
	for i := range tail {
		for j := range tail[i] {
			if math.Abs(f.R[i][2+j]-tail[i][j]) > tol {
				t.Errorf("R[%d][%d] = %g, want (QT*A2)[%d][%d] = %g", i, 2+j, f.R[i][2+j], i, j, tail[i][j])
			}
		}
	}
	nonZero := false
	for i := range tail {
		for j := range tail[i] {
			nonZero = nonZero || math.Abs(f.R[i][2+j]) > tol
		}
	}
	if !nonZero {
		t.Fatal("tail of R is all zeros; the Q^T*A2 step is missing")
	}
	assertQR(t, a, f)
}

func TestFactorize_LargeRandomMatrices_FixedSeed_SatisfyQRProperties(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name       string
		rows, cols int
	}{
		{"tall 50x30", 50, 30},
		{"wide 30x50", 30, 50},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			rng := rand.New(rand.NewPCG(42, 7))
			a := randomMatrix(rng, tt.rows, tt.cols)
			assertQR(t, a, factorize(t, a))
		})
	}
}

func TestFactorize_DoesNotMutateInput(t *testing.T) {
	t.Parallel()
	a := domain.Matrix{{1, 2, 3}, {4, 5, 6}}
	factorize(t, a)
	want := domain.Matrix{{1, 2, 3}, {4, 5, 6}}
	for i := range want {
		for j := range want[i] {
			if a[i][j] != want[i][j] {
				t.Fatalf("input mutated at [%d][%d]: %g", i, j, a[i][j])
			}
		}
	}
}

// Overflow is detected by the use case (IsFinite), not by this adapter. The
// adapter contract is: never panic and never return an error for finite input,
// so the caller can reliably classify the result.
func TestFactorize_HugeValues_NeverPanicsAndOverflowIsDetectable(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name       string
		a          domain.Matrix
		wantFinite bool
	}{
		{"single 1e308 stays finite", domain.Matrix{{1e308}}, true},
		{"square 1e308 overflows", domain.Matrix{{1e308, 1e308}, {1e308, 1e308}}, false},
		{"wide 1e308 overflows", domain.Matrix{{1e308, -1e308, 1e308}, {1e308, 1e308, 1e308}}, false},
		{"near max float overflows", domain.Matrix{{1.7e308, 1.7e308}, {1.7e308, -1.7e308}}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			f, err := gonumqr.New().Factorize(tt.a)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got := f.Q.IsFinite() && f.R.IsFinite(); got != tt.wantFinite {
				t.Fatalf("result finite = %v, want %v", got, tt.wantFinite)
			}
		})
	}
}

// The domain guarantees rectangular input, but the port promises "never panic":
// a shape violation reaching Gonum must come back as an error.
func TestFactorize_RaggedInputBypassingValidation_ReturnsErrorInsteadOfPanicking(t *testing.T) {
	t.Parallel()
	_, err := gonumqr.New().Factorize(domain.Matrix{{1, 2}, {3}})
	if err == nil {
		t.Fatal("expected an error for a ragged matrix")
	}
}
