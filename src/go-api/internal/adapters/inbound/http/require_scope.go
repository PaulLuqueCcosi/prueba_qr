package http

import (
	"github.com/gofiber/fiber/v3"

	"go-api/internal/application"
)

// requireScope must run after authenticate; a missing identity fails closed with 401.
func requireScope(scope string, logger application.Logger) fiber.Handler {
	return func(c fiber.Ctx) error {
		claims, ok := c.Locals(claimsKey{}).(application.Claims)
		if !ok {
			return errUnauthorized{tokenPresent: false}
		}
		if !claims.HasScope(scope) {
			logger.Warn("auth rejected", application.Fields{"reason": "insufficient_scope"})
			return errForbidden{scope: scope}
		}
		return c.Next()
	}
}
