import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

// Dependency rule: domain <- application <- adapters <- main.
// Relative-import globs match on the import string, so folder names are the contract.
const restrict = (...groups) => ({
  'no-restricted-imports': ['error', { patterns: groups }],
});
const group = (message, paths) => ({ group: paths, message });

const frameworkImports = group('Framework and Node APIs are not allowed in the core.', [
  'express',
  'express/*',
  'node:*',
]);
const noMain = group('Nothing may depend on main (composition root).', ['**/main/**']);
const noAdapters = group('The core must not depend on adapters.', ['**/adapters/**']);
const noApplication = group('The domain must not depend on application.', ['**/application/**']);
const noConfig = group('The core must not read configuration; inject values instead.', [
  '**/config/**',
]);

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly' },
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: restrict(frameworkImports, noApplication, noAdapters, noConfig, noMain),
  },
  {
    files: ['src/application/**/*.ts'],
    rules: restrict(frameworkImports, noAdapters, noConfig, noMain),
  },
  {
    files: ['src/adapters/inbound/**/*.ts'],
    rules: restrict(
      noMain,
      group('Inbound adapters must not depend on outbound adapters.', ['**/adapters/outbound/**']),
    ),
  },
  {
    // Controllers talk to the inbound port only; domain errors are mapped in middleware.
    files: [
      'src/adapters/inbound/http/controllers/**/*.ts',
      'src/adapters/inbound/http/routes/**/*.ts',
    ],
    rules: restrict(
      noMain,
      group('Inbound adapters must not depend on outbound adapters.', ['**/adapters/outbound/**']),
      group('Controllers and routes must go through the inbound port, not the domain.', [
        '**/domain/**',
      ]),
    ),
  },
  {
    files: ['src/adapters/outbound/**/*.ts'],
    rules: restrict(
      noMain,
      group('Outbound adapters must not depend on inbound adapters.', ['**/adapters/inbound/**']),
    ),
  },
);
