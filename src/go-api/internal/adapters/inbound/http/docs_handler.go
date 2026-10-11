package http

import (
	_ "embed"

	"github.com/gofiber/fiber/v3"
)

// The spec lives next to the adapter that serves it: documentation is an
// inbound-adapter concern and never leaks into domain or application.
//
//go:embed openapi/openapi.yaml
var openAPISpec []byte

// Swagger UI assets come from a version-pinned CDN URL instead of being embedded:
// the dist bundle is ~1.5 MB and would dominate the repo for a docs-only page.
const swaggerUIPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>go-api - API docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/openapi.yaml', dom_id: '#swagger-ui' });
    </script>
  </body>
</html>`

func openAPIHandler(c fiber.Ctx) error {
	c.Set(fiber.HeaderContentType, "application/yaml; charset=utf-8")
	return c.Send(openAPISpec)
}

func docsHandler(c fiber.Ctx) error {
	c.Set(fiber.HeaderContentType, fiber.MIMETextHTMLCharsetUTF8)
	return c.SendString(swaggerUIPage)
}
