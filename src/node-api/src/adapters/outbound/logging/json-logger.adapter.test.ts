import { afterEach, describe, expect, it, vi } from 'vitest';
import { JsonLogger } from './json-logger.adapter.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function capture(): string[] {
  const lines: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    lines.push(String(chunk));
    return true;
  });
  return lines;
}

describe('JsonLogger', () => {
  it.each(['info', 'warn', 'error'] as const)(
    'writes one JSON line with level "%s", message, time and fields',
    (level) => {
      const lines = capture();
      new JsonLogger()[level]('hello', { a: 1 });

      expect(lines).toHaveLength(1);
      expect(lines[0]!.endsWith('\n')).toBe(true);
      const entry = JSON.parse(lines[0]!) as Record<string, unknown>;
      expect(entry).toMatchObject({ level, message: 'hello', a: 1 });
      expect(Number.isNaN(Date.parse(entry['time'] as string))).toBe(false);
    },
  );

  it('works without fields', () => {
    const lines = capture();
    new JsonLogger().info('plain');
    expect(JSON.parse(lines[0]!)).toMatchObject({ level: 'info', message: 'plain' });
  });
});
