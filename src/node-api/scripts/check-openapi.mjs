// Lightweight spec guard: the spec must parse, every $ref must resolve and every
// documented operation must exist in the real app (i.e. not answer 404 NOT_FOUND).
// Run `npm run check:openapi`; it needs a prior build because it boots dist/.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { createApp } from '../dist/main/composition-root.js';

const spec = parse(readFileSync(new URL('../openapi/openapi.yaml', import.meta.url), 'utf8'));
const problems = [];

const walk = (node) => {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref') {
        const target = String(value).replace('#/', '').split('/');
        if (target.reduce((acc, part) => acc?.[part], spec) === undefined) {
          problems.push(`unresolved $ref ${value}`);
        }
      } else walk(value);
    }
  }
};
walk(spec);

const config = {
  port: 0,
  diagonalTolerance: 1e-9,
  auth: {
    endpoint: 'https://example.logto.app',
    issuer: 'https://example.logto.app/oidc',
    jwksUri: 'https://example.logto.app/oidc/jwks',
    audience: 'check',
  },
  corsOrigins: [],
};
const app = createApp(config, { logger: { info() {}, warn() {}, error() {} } });
const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;

for (const [path, operations] of Object.entries(spec.paths)) {
  for (const method of Object.keys(operations)) {
    const response = await fetch(base + path, {
      method: method.toUpperCase(),
      headers: { 'content-type': 'application/json' },
      body: method === 'get' ? undefined : '{}',
    });
    const documented = Object.keys(operations[method].responses);
    if (response.status === 404) {
      problems.push(`${method.toUpperCase()} ${path} is documented but not implemented`);
    } else if (!documented.includes(String(response.status))) {
      problems.push(`${method.toUpperCase()} ${path} answered undocumented ${response.status}`);
    }
  }
}
server.close();

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`openapi OK: ${Object.keys(spec.paths).length} paths checked`);
