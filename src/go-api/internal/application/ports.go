package application

import (
	"context"

	"go-api/internal/domain"
)

// FactorizeMatrixPort is the inbound port: what the HTTP adapter calls.
type FactorizeMatrixPort interface {
	Execute(ctx context.Context, rows [][]float64) (QRResult, error)
}

// MatrixFactorizer is an outbound port. Implementations must support any
// rectangular shape and never panic.
type MatrixFactorizer interface {
	Factorize(m domain.Matrix) (domain.Factorization, error)
}

// StatisticsClient is an outbound port. Failures must wrap domain.ErrUpstreamUnavailable.
type StatisticsClient interface {
	Calculate(ctx context.Context, matrices domain.Matrices) (domain.Statistics, error)
}

type Fields map[string]any

// Logger is an outbound port consumed by the HTTP adapter.
type Logger interface {
	Info(message string, fields Fields)
	Warn(message string, fields Fields)
	Error(message string, fields Fields)
}
