package domain_test

import (
	"errors"
	"math"
	"testing"

	"go-api/internal/domain"
)

func TestNewMatrix_ValidShapes_ReturnsSameValuesAndDims(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name     string
		rows     [][]float64
		wantRows int
		wantCols int
	}{
		{"1x1", [][]float64{{7}}, 1, 1},
		{"square", [][]float64{{1, 2}, {3, 4}}, 2, 2},
		{"tall", [][]float64{{1}, {2}, {3}}, 3, 1},
		{"wide", [][]float64{{1, 2, 3}, {4, 5, 6}}, 2, 3},
		{"negatives and decimals", [][]float64{{-1.5, 0.25}}, 1, 2},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			m, err := domain.NewMatrix(tt.rows)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if m.Rows() != tt.wantRows || m.Cols() != tt.wantCols {
				t.Fatalf("dims = %dx%d, want %dx%d", m.Rows(), m.Cols(), tt.wantRows, tt.wantCols)
			}
			for i := range tt.rows {
				for j := range tt.rows[i] {
					if m[i][j] != tt.rows[i][j] {
						t.Fatalf("value at [%d][%d] = %v, want %v", i, j, m[i][j], tt.rows[i][j])
					}
				}
			}
		})
	}
}

func TestNewMatrix_InvalidInput_ReturnsInvalidMatrixError(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		rows [][]float64
	}{
		{"nil", nil},
		{"no rows", [][]float64{}},
		{"empty first row", [][]float64{{}}},
		{"empty rows", [][]float64{{}, {}}},
		{"ragged (shorter row)", [][]float64{{1, 2}, {3}}},
		{"ragged (longer row)", [][]float64{{1}, {2, 3}}},
		{"empty row after a full one", [][]float64{{1, 2}, {}}},
		{"NaN", [][]float64{{1, math.NaN()}}},
		{"+Inf", [][]float64{{math.Inf(1)}}},
		{"-Inf", [][]float64{{1, 2}, {3, math.Inf(-1)}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			m, err := domain.NewMatrix(tt.rows)
			if !errors.Is(err, domain.ErrInvalidMatrix) {
				t.Fatalf("err = %v, want ErrInvalidMatrix", err)
			}
			if m != nil {
				t.Fatalf("matrix = %v, want nil on error", m)
			}
			if err.Error() == "" {
				t.Fatal("error detail must not be empty")
			}
		})
	}
}

func TestNewMatrix_NonFiniteValue_ReportsPosition(t *testing.T) {
	t.Parallel()
	_, err := domain.NewMatrix([][]float64{{1, 2}, {3, math.NaN()}})
	want := "Matrix must contain only finite numbers: invalid value at row 1, column 1"
	if err == nil || err.Error() != want {
		t.Fatalf("err = %v, want %q", err, want)
	}
}

func TestMatrix_IsFinite(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		m    domain.Matrix
		want bool
	}{
		{"finite values", domain.Matrix{{1, -2}, {0, 3.5}}, true},
		{"empty matrix", domain.Matrix{}, true},
		{"contains NaN", domain.Matrix{{1, math.NaN()}}, false},
		{"contains +Inf", domain.Matrix{{math.Inf(1)}}, false},
		{"contains -Inf in later row", domain.Matrix{{1}, {math.Inf(-1)}}, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := tt.m.IsFinite(); got != tt.want {
				t.Fatalf("IsFinite() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestMatrix_EmptyMatrix_HasZeroDimensions(t *testing.T) {
	t.Parallel()
	var m domain.Matrix
	if m.Rows() != 0 || m.Cols() != 0 {
		t.Fatalf("dims = %dx%d, want 0x0", m.Rows(), m.Cols())
	}
}
