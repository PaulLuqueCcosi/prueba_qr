package http

import (
	"github.com/gofiber/fiber/v3"
)

// cors uses an explicit allow-list (never "*") because the API takes bearer
// tokens from browsers. Disallowed origins simply get no CORS headers.
func cors(allowedOrigins []string) fiber.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		allowed[origin] = struct{}{}
	}

	return func(c fiber.Ctx) error {
		origin := c.Get(fiber.HeaderOrigin)
		_, isAllowed := allowed[origin]
		c.Vary(fiber.HeaderOrigin)
		if isAllowed {
			c.Set(fiber.HeaderAccessControlAllowOrigin, origin)
		}

		isPreflight := c.Method() == fiber.MethodOptions && c.Get(fiber.HeaderAccessControlRequestMethod) != ""
		if !isPreflight {
			return c.Next()
		}

		// Answered before auth: browsers never send credentials on a preflight.
		if isAllowed {
			c.Set(fiber.HeaderAccessControlAllowMethods, "GET,POST,OPTIONS")
			c.Set(fiber.HeaderAccessControlAllowHeaders, "Content-Type, Authorization")
			c.Set(fiber.HeaderAccessControlMaxAge, "600")
		}
		return c.SendStatus(fiber.StatusNoContent)
	}
}
