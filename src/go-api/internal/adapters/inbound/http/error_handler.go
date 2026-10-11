package http

import (
	"errors"

	"github.com/gofiber/fiber/v3"

	"go-api/internal/application"
	"go-api/internal/domain"
)

type mappedError struct {
	status  int
	code    string
	message string
	// challenge becomes the WWW-Authenticate header (RFC 6750) when set.
	challenge string
}

// mapError is the single domain-error -> HTTP translation point, so the domain
// stays transport-agnostic.
func mapError(err error) mappedError {
	var unauthorized errUnauthorized
	var forbidden errForbidden
	switch {
	case errors.As(err, &unauthorized):
		// One message for every cause: callers are never told why verification failed.
		challenge := "Bearer"
		if unauthorized.tokenPresent {
			challenge = `Bearer error="invalid_token"`
		}
		return mappedError{fiber.StatusUnauthorized, "UNAUTHORIZED", "Authentication required", challenge}
	case errors.As(err, &forbidden):
		challenge := `Bearer error="insufficient_scope", scope="` + forbidden.scope + `"`
		return mappedError{fiber.StatusForbidden, "FORBIDDEN", "Insufficient scope for this resource", challenge}
	case errors.Is(err, errInvalidJSON):
		return mappedError{fiber.StatusBadRequest, "INVALID_JSON", "Request body is not valid JSON", ""}
	case errors.Is(err, domain.ErrInvalidMatrix):
		return mappedError{fiber.StatusUnprocessableEntity, "INVALID_MATRIX", err.Error(), ""}
	case errors.Is(err, domain.ErrNonFiniteResult):
		return mappedError{fiber.StatusUnprocessableEntity, "NON_FINITE_RESULT", err.Error(), ""}
	case errors.Is(err, domain.ErrUpstreamUnavailable):
		return mappedError{fiber.StatusBadGateway, "UPSTREAM_UNAVAILABLE", "Statistics service is unavailable", ""}
	}

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		switch fiberErr.Code {
		case fiber.StatusNotFound, fiber.StatusMethodNotAllowed:
			return mappedError{fiber.StatusNotFound, "NOT_FOUND", "Route not found", ""}
		case fiber.StatusRequestEntityTooLarge:
			return mappedError{fiber.StatusRequestEntityTooLarge, "PAYLOAD_TOO_LARGE", "Request body exceeds the size limit", ""}
		}
	}

	return mappedError{fiber.StatusInternalServerError, "INTERNAL_ERROR", "Unexpected error", ""}
}

func newErrorHandler(logger application.Logger) fiber.ErrorHandler {
	return func(c fiber.Ctx, err error) error {
		mapped := mapError(err)
		// Internal causes are logged, never returned to the client.
		if mapped.status >= 500 {
			logger.Error("request failed", application.Fields{"error": err.Error(), "code": mapped.code})
		}
		if mapped.challenge != "" {
			c.Set(fiber.HeaderWWWAuthenticate, mapped.challenge)
		}
		return c.Status(mapped.status).JSON(errorResponse{Error: errorBody{Code: mapped.code, Message: mapped.message}})
	}
}
