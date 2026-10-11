package http

import "github.com/gofiber/fiber/v3"

// Private routes run auth first and body-size checks after it, so unauthenticated
// callers' payloads are never read.
func registerRoutes(app *fiber.App, qr qrHandler, authenticate fiber.Handler) {
	app.Get("/health", healthHandler)
	app.Post("/api/v1/qr", authenticate, bodyLimitGuard, qr.Handle)
	app.Get("/openapi.yaml", openAPIHandler)
	app.Get("/docs", docsHandler)

	// Registered last so it only catches what no route matched.
	app.Use(func(c fiber.Ctx) error {
		return fiber.ErrNotFound
	})
}
