package http

import (
	"errors"
	"regexp"

	"github.com/gofiber/fiber/v3"

	"go-api/internal/application"
)

const scopeQRWrite = "qr:write"

var bearerHeader = regexp.MustCompile(`(?i)^Bearer ([^\s]+)$`)

type claimsKey struct{}

// errUnauthorized and errForbidden are mapped to 401/403 by the error handler,
// which also sets WWW-Authenticate, so the logged status is always the sent one.
type errUnauthorized struct{ tokenPresent bool }

func (errUnauthorized) Error() string { return "authentication required" }

type errForbidden struct{ scope string }

func (errForbidden) Error() string { return "insufficient scope" }

// authenticate runs before any body handling: callers without a valid token
// never get their payload read or parsed.
func authenticate(verifier application.TokenVerifier, logger application.Logger) fiber.Handler {
	return func(c fiber.Ctx) error {
		match := bearerHeader.FindStringSubmatch(c.Get(fiber.HeaderAuthorization))
		if match == nil {
			logger.Warn("auth rejected", application.Fields{"reason": "missing_or_malformed_header"})
			return errUnauthorized{tokenPresent: false}
		}
		token := match[1]

		claims, err := verifier.Verify(c.Context(), token)
		if err != nil {
			// Only a reason code is logged; neither the token nor the verifier's
			// internal detail may reach logs or the response.
			reason := "verifier_error"
			var tokenErr *application.TokenError
			if errors.As(err, &tokenErr) {
				reason = tokenErr.Reason
			}
			logger.Warn("auth rejected", application.Fields{"reason": reason})
			return errUnauthorized{tokenPresent: true}
		}

		c.Locals(claimsKey{}, claims)
		// The use case forwards this token to node-api through the context.
		c.SetContext(application.WithAccessToken(c.Context(), token))
		return c.Next()
	}
}
