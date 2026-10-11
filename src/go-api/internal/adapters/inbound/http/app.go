package http

import (
	"encoding/json"
	"io"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/recover"

	"go-api/internal/application"
)

const bodyLimitBytes = 1 << 20

type Dependencies struct {
	FactorizeMatrix application.FactorizeMatrixPort
	Logger          application.Logger
}

// NewApp builds the Fiber app without listening, so it can be used by tests.
func NewApp(deps Dependencies) *fiber.App {
	errorHandler := newErrorHandler(deps.Logger)

	app := fiber.New(fiber.Config{
		BodyLimit: bodyLimitBytes,
		// Streaming lets the handler answer 413 before the upload finishes; without it
		// fasthttp closes the socket with unread data and the client sees ECONNRESET.
		StreamRequestBody: true,
		ErrorHandler:      errorHandler,
		JSONEncoder:       json.Marshal,
		JSONDecoder:       json.Unmarshal,
	})

	// Logger wraps recover so panics are turned into errors and logged with their final status.
	app.Use(requestLogger(deps.Logger, errorHandler))
	app.Use(recover.New())
	app.Use(bodyLimitGuard)

	registerRoutes(app, qrHandler{factorize: deps.FactorizeMatrix})
	return app
}

// bodyLimitGuard enforces the size limit explicitly because streaming disables
// fasthttp's own check. Chunked bodies have no declared length, so they are read
// through a capped reader instead of trusting the header.
func bodyLimitGuard(c fiber.Ctx) error {
	req := c.Request()
	if req.Header.ContentLength() > bodyLimitBytes {
		return fiber.ErrRequestEntityTooLarge
	}
	if req.Header.ContentLength() < 0 && req.BodyStream() != nil {
		body, err := io.ReadAll(io.LimitReader(req.BodyStream(), bodyLimitBytes+1))
		if err != nil {
			return errInvalidJSON
		}
		if len(body) > bodyLimitBytes {
			return fiber.ErrRequestEntityTooLarge
		}
		req.SetBody(body)
	}
	return c.Next()
}
