import { type ZodError, type ZodFormattedError } from 'zod';

export function formatError(message: string, error: ZodError): string {
  const lines: string[] = [];

  function walk(
    key: string | undefined,
    { _errors, ...rest }: ZodFormattedError<any>,
    padStart = 0,
  ): void {
    if (key !== undefined || _errors.length > 0) {
      const text = key
        ? `${key}: ${_errors.join('\n    ')}`
        : _errors.join('\n');

      lines.push(
        text
          .split('\n')
          .map((line) => `${' '.repeat(padStart)}${line}`)
          .join('\n'),
      );
    }

    for (const [k, v] of Object.entries(rest)) {
      walk(key ? `${key}.${k}` : k, v as ZodFormattedError<any>, padStart + 2);
    }
  }

  walk(undefined, error.format());

  return [message, ...lines].join('\n');
}
