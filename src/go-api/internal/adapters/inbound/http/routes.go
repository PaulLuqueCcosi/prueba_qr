package http

import "github.com/gofiber/fiber/v3"

func registerRoutes(app *fiber.App, qr qrHandler) {
	app.Get("/health", healthHandler)
	app.Post("/api/v1/qr", qr.Handle)
	app.Get("/openapi.yaml", openAPIHandler)
	app.Get("/docs", docsHandler)

	// Registered last so it only catches what no route matched.
	app.Use(func(c fiber.Ctx) error {
		return fiber.ErrNotFound
	})
}
