package gonumqr

import (
	"fmt"

	"gonum.org/v1/gonum/mat"

	"go-api/internal/application"
	"go-api/internal/domain"
)

type Factorizer struct{}

var _ application.MatrixFactorizer = Factorizer{}

func New() Factorizer { return Factorizer{} }

// Factorize returns the full QR decomposition (Q m×m, R m×n).
func (Factorizer) Factorize(m domain.Matrix) (result domain.Factorization, err error) {
	// Gonum signals misuse by panicking; a panic must never escape the adapter.
	defer func() {
		if r := recover(); r != nil {
			result = domain.Factorization{}
			err = fmt.Errorf("gonum qr failed: %v", r)
		}
	}()

	rows, cols := m.Rows(), m.Cols()

	data := make([]float64, 0, rows*cols)
	for _, row := range m {
		data = append(data, row...)
	}
	a := mat.NewDense(rows, cols, data)

	// mat.QR.Factorize requires rows >= cols, so a wide matrix (rows < cols)
	// factorizes only its leading square block A1 = Q*R1. Since Q is orthogonal,
	// A = Q*(Q^T*A), and Q^T*A = [R1 | Q^T*A2] is upper trapezoidal. R1 comes
	// straight from Gonum (not Q^T*A1) so entries below the diagonal stay exact zeros.
	if rows < cols {
		return factorizeWide(a, rows, cols), nil
	}

	var qr mat.QR
	qr.Factorize(a)

	var q, r mat.Dense
	qr.QTo(&q)
	qr.RTo(&r)

	return domain.Factorization{Q: toRows(&q), R: toRows(&r)}, nil
}

func factorizeWide(a *mat.Dense, rows, cols int) domain.Factorization {
	var qr mat.QR
	qr.Factorize(a.Slice(0, rows, 0, rows))

	var q, r1 mat.Dense
	qr.QTo(&q)
	qr.RTo(&r1)

	var tail mat.Dense
	tail.Mul(q.T(), a.Slice(0, rows, rows, cols))

	r := mat.NewDense(rows, cols, nil)
	r.Slice(0, rows, 0, rows).(*mat.Dense).Copy(&r1)
	r.Slice(0, rows, rows, cols).(*mat.Dense).Copy(&tail)

	return domain.Factorization{Q: toRows(&q), R: toRows(r)}
}

func toRows(d mat.Matrix) domain.Matrix {
	rows, cols := d.Dims()
	out := make(domain.Matrix, rows)
	for i := range out {
		out[i] = make([]float64, cols)
		for j := range out[i] {
			out[i][j] = d.At(i, j)
		}
	}
	return out
}
