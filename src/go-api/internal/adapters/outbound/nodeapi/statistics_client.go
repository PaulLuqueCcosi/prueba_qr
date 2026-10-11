package nodeapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"go-api/internal/application"
	"go-api/internal/domain"
)

const (
	statisticsPath   = "/api/v1/statistics"
	maxResponseBytes = 1 << 20
)

type StatisticsClient struct {
	endpoint string
	http     *http.Client
}

var _ application.StatisticsClient = (*StatisticsClient)(nil)

func NewStatisticsClient(baseURL string, timeout time.Duration) (*StatisticsClient, error) {
	endpoint, err := url.JoinPath(baseURL, statisticsPath)
	if err != nil {
		return nil, fmt.Errorf("build statistics endpoint: %w", err)
	}
	// The client-level timeout bounds connect, send and read together.
	return &StatisticsClient{endpoint: endpoint, http: &http.Client{Timeout: timeout}}, nil
}

type requestBody struct {
	Matrices matricesDTO `json:"matrices"`
}

type matricesDTO struct {
	Original [][]float64 `json:"original"`
	Q        [][]float64 `json:"q"`
	R        [][]float64 `json:"r"`
}

type statisticsDTO struct {
	Max        float64 `json:"max"`
	Min        float64 `json:"min"`
	Average    float64 `json:"average"`
	Sum        float64 `json:"sum"`
	IsDiagonal struct {
		Original bool `json:"original"`
		Q        bool `json:"q"`
		R        bool `json:"r"`
	} `json:"isDiagonal"`
	AnyDiagonal bool `json:"anyDiagonal"`
}

// Calculate wraps every failure in ErrUpstreamUnavailable; the cause stays in
// the message for logs and is never shown to API clients.
func (c *StatisticsClient) Calculate(ctx context.Context, m domain.Matrices) (domain.Statistics, error) {
	payload, err := json.Marshal(requestBody{Matrices: matricesDTO{Original: m.Original, Q: m.Q, R: m.R}})
	if err != nil {
		return domain.Statistics{}, domain.NewUpstreamUnavailableError("encode statistics request: " + err.Error())
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(payload))
	if err != nil {
		return domain.Statistics{}, domain.NewUpstreamUnavailableError("build statistics request: " + err.Error())
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return domain.Statistics{}, domain.NewUpstreamUnavailableError("call node-api: " + err.Error())
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxResponseBytes))
	if err != nil {
		return domain.Statistics{}, domain.NewUpstreamUnavailableError("read node-api response: " + err.Error())
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return domain.Statistics{}, domain.NewUpstreamUnavailableError(fmt.Sprintf("node-api responded with status %d", resp.StatusCode))
	}

	var dto statisticsDTO
	if err := json.Unmarshal(body, &dto); err != nil {
		return domain.Statistics{}, domain.NewUpstreamUnavailableError("decode node-api response: " + err.Error())
	}

	return domain.Statistics{
		Max:         dto.Max,
		Min:         dto.Min,
		Average:     dto.Average,
		Sum:         dto.Sum,
		IsDiagonal:  domain.DiagonalFlags{Original: dto.IsDiagonal.Original, Q: dto.IsDiagonal.Q, R: dto.IsDiagonal.R},
		AnyDiagonal: dto.AnyDiagonal,
	}, nil
}
