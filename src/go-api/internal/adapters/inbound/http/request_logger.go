package http

import (
	"time"

	"github.com/gofiber/fiber/v3"

	"go-api/internal/application"
)

// requestLogger resolves errors itself so the logged status is the one actually
// sent; otherwise the status would still be 200 when the chain returns an error.
func requestLogger(logger application.Logger, handleError fiber.ErrorHandler) fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		if err != nil {
			err = handleError(c, err)
		}
		logger.Info("request", application.Fields{
			"method":     c.Method(),
			"path":       c.Path(),
			"status":     c.Response().StatusCode(),
			"durationMs": float64(time.Since(start).Microseconds()) / 1000,
		})
		return err
	}
}
