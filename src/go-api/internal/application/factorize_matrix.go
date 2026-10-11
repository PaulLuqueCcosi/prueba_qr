package application

import (
	"context"

	"go-api/internal/domain"
)

// QRResult is the use case output; statistics are whatever the statistics service returned.
type QRResult struct {
	Original   domain.Matrix
	Q          domain.Matrix
	R          domain.Matrix
	Statistics domain.Statistics
}

type FactorizeMatrix struct {
	factorizer MatrixFactorizer
	statistics StatisticsClient
}

var _ FactorizeMatrixPort = (*FactorizeMatrix)(nil)

func NewFactorizeMatrix(factorizer MatrixFactorizer, statistics StatisticsClient) *FactorizeMatrix {
	return &FactorizeMatrix{factorizer: factorizer, statistics: statistics}
}

func (uc *FactorizeMatrix) Execute(ctx context.Context, rows [][]float64) (QRResult, error) {
	original, err := domain.NewMatrix(rows)
	if err != nil {
		return QRResult{}, err
	}

	factorization, err := uc.factorizer.Factorize(original)
	if err != nil {
		return QRResult{}, err
	}

	// Overflow on extreme inputs can yield Inf/NaN; JSON cannot represent them,
	// so fail explicitly here rather than at serialization time.
	if !factorization.Q.IsFinite() || !factorization.R.IsFinite() {
		return QRResult{}, domain.NewNonFiniteResultError("Factorization produced non-finite values for this matrix")
	}

	stats, err := uc.statistics.Calculate(ctx, domain.Matrices{
		Original: original,
		Q:        factorization.Q,
		R:        factorization.R,
	})
	if err != nil {
		return QRResult{}, err
	}

	return QRResult{Original: original, Q: factorization.Q, R: factorization.R, Statistics: stats}, nil
}
