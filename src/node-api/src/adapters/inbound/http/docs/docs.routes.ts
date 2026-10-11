import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

// Same relative depth from src/ and dist/, so the spec resolves in dev and in production
// (tsc does not copy .yaml files).
const specUrl = new URL('../../../../../openapi/openapi.yaml', import.meta.url);

// Documentation is an inbound-adapter concern: the core never sees it.
export function createDocsRouter(): Router {
  const rawSpec = readFileSync(fileURLToPath(specUrl), 'utf8');
  const document = parse(rawSpec) as Record<string, unknown>;

  const router = Router();
  router.get('/openapi.yaml', (_req, res) => {
    res.type('application/yaml').send(rawSpec);
  });
  router.use(
    '/docs',
    swaggerUi.serve,
    // Points the UI at the raw route so there is a single source of truth.
    swaggerUi.setup(document, { swaggerOptions: { url: '/openapi.yaml' } }),
  );
  return router;
}
