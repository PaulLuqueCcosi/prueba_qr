import type { LogFields, LoggerPort } from '../../../application/ports/outbound/logger.port.js';

type Level = 'info' | 'warn' | 'error';

function write(level: Level, message: string, fields: LogFields = {}): void {
  // One JSON object per line keeps logs parseable by any collector without a dependency.
  process.stdout.write(
    `${JSON.stringify({ time: new Date().toISOString(), level, message, ...fields })}\n`,
  );
}

export class JsonLogger implements LoggerPort {
  info(message: string, fields?: LogFields): void {
    write('info', message, fields);
  }
  warn(message: string, fields?: LogFields): void {
    write('warn', message, fields);
  }
  error(message: string, fields?: LogFields): void {
    write('error', message, fields);
  }
}
