package domain

import "errors"

// Sentinel kinds let adapters map failures with errors.Is without parsing messages.
var (
	ErrInvalidMatrix       = errors.New("invalid matrix")
	ErrNonFiniteResult     = errors.New("non-finite factorization result")
	ErrUpstreamUnavailable = errors.New("upstream unavailable")
)

// detailedError pairs a stable kind with a human-readable detail, so the kind
// drives behavior while the detail can be shown to the client or logged.
type detailedError struct {
	kind   error
	detail string
}

func (e *detailedError) Error() string { return e.detail }
func (e *detailedError) Unwrap() error { return e.kind }

func NewInvalidMatrixError(detail string) error {
	return &detailedError{kind: ErrInvalidMatrix, detail: detail}
}

func NewNonFiniteResultError(detail string) error {
	return &detailedError{kind: ErrNonFiniteResult, detail: detail}
}

// NewUpstreamUnavailableError keeps the internal cause out of Error() callers
// show to clients; adapters log the detail instead.
func NewUpstreamUnavailableError(detail string) error {
	return &detailedError{kind: ErrUpstreamUnavailable, detail: detail}
}
