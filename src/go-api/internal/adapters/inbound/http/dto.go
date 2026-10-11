package http

import (
	"encoding/json"
	"errors"

	"go-api/internal/application"
	"go-api/internal/domain"
)

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type healthResponse struct {
	Status string `json:"status"`
}

type diagonalFlagsDTO struct {
	Original bool `json:"original"`
	Q        bool `json:"q"`
	R        bool `json:"r"`
}

type statisticsDTO struct {
	Max         float64          `json:"max"`
	Min         float64          `json:"min"`
	Average     float64          `json:"average"`
	Sum         float64          `json:"sum"`
	IsDiagonal  diagonalFlagsDTO `json:"isDiagonal"`
	AnyDiagonal bool             `json:"anyDiagonal"`
}

type qrResponse struct {
	Original   [][]float64   `json:"original"`
	Q          [][]float64   `json:"q"`
	R          [][]float64   `json:"r"`
	Statistics statisticsDTO `json:"statistics"`
}

func toQRResponse(r application.QRResult) qrResponse {
	return qrResponse{
		Original: r.Original,
		Q:        r.Q,
		R:        r.R,
		Statistics: statisticsDTO{
			Max:         r.Statistics.Max,
			Min:         r.Statistics.Min,
			Average:     r.Statistics.Average,
			Sum:         r.Statistics.Sum,
			IsDiagonal:  diagonalFlagsDTO(r.Statistics.IsDiagonal),
			AnyDiagonal: r.Statistics.AnyDiagonal,
		},
	}
}

var errInvalidJSON = errors.New("request body is not valid JSON")

// parseMatrixRequest separates syntax errors (400) from shape/type errors (422):
// syntactically valid JSON with a wrong matrix is a semantic problem, not a parse one.
func parseMatrixRequest(body []byte) ([][]float64, error) {
	var envelope struct {
		Matrix json.RawMessage `json:"matrix"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		var typeErr *json.UnmarshalTypeError
		if errors.As(err, &typeErr) {
			return nil, domain.NewInvalidMatrixError(`Request body must be a JSON object with a "matrix" field`)
		}
		return nil, errInvalidJSON
	}
	if len(envelope.Matrix) == 0 || string(envelope.Matrix) == "null" {
		return nil, domain.NewInvalidMatrixError(`Field "matrix" is required`)
	}

	// Pointers make JSON null distinguishable from 0; strings and objects fail the decode.
	var raw [][]*float64
	if err := json.Unmarshal(envelope.Matrix, &raw); err != nil {
		return nil, domain.NewInvalidMatrixError("Matrix must be an array of rows containing only numbers")
	}

	rows := make([][]float64, len(raw))
	for i, rawRow := range raw {
		rows[i] = make([]float64, len(rawRow))
		for j, v := range rawRow {
			if v == nil {
				return nil, domain.NewInvalidMatrixError("Matrix must contain only numbers: null found")
			}
			rows[i][j] = *v
		}
	}
	return rows, nil
}
