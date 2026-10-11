package domain

import (
	"fmt"
	"math"
)

// Matrix is a non-empty, rectangular grid of finite numbers (row-major).
type Matrix [][]float64

// NewMatrix validates the rules the whole service relies on, so downstream
// code never has to re-check shape or finiteness of user input.
func NewMatrix(rows [][]float64) (Matrix, error) {
	if len(rows) == 0 || len(rows[0]) == 0 {
		return nil, NewInvalidMatrixError("Matrix must be non-empty")
	}
	cols := len(rows[0])
	for i, row := range rows {
		if len(row) != cols {
			return nil, NewInvalidMatrixError(
				fmt.Sprintf("Matrix must be rectangular: row %d has %d columns, expected %d", i, len(row), cols))
		}
		for j, v := range row {
			if math.IsNaN(v) || math.IsInf(v, 0) {
				return nil, NewInvalidMatrixError(
					fmt.Sprintf("Matrix must contain only finite numbers: invalid value at row %d, column %d", i, j))
			}
		}
	}
	return Matrix(rows), nil
}

func (m Matrix) Rows() int { return len(m) }

func (m Matrix) Cols() int {
	if len(m) == 0 {
		return 0
	}
	return len(m[0])
}

func (m Matrix) IsFinite() bool {
	for _, row := range m {
		for _, v := range row {
			if math.IsNaN(v) || math.IsInf(v, 0) {
				return false
			}
		}
	}
	return true
}
