package http

import (
	"github.com/gofiber/fiber/v3"

	"go-api/internal/application"
)

type qrHandler struct {
	factorize application.FactorizeMatrixPort
}

// Handle returns errors instead of writing them; the app-level error handler owns the mapping.
func (h qrHandler) Handle(c fiber.Ctx) error {
	rows, err := parseMatrixRequest(c.Body())
	if err != nil {
		return err
	}
	result, err := h.factorize.Execute(c.Context(), rows)
	if err != nil {
		return err
	}
	return c.JSON(toQRResponse(result))
}
