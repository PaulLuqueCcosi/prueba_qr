package http

import "github.com/gofiber/fiber/v3"

func healthHandler(c fiber.Ctx) error {
	return c.JSON(healthResponse{Status: "ok"})
}
