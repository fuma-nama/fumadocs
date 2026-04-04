// @ts-expect-error -- nothing
import js2xml from 'xml-js/lib/js2xml';

/**
 * Convert input value to hardcoded string (with quotes)
 */
export function inputToString(
  value: unknown,
  format:
    | 'application/x-www-form-urlencoded'
    | 'application/x-ndjson'
    | 'application/json'
    | 'application/xml' = 'application/json',
): string {
  if (typeof value === 'string') return value;

  if (format === 'application/json') {
    return JSON.stringify(value, null, 2);
  }

  if (format === 'application/x-ndjson') {
    return Array.isArray(value)
      ? value.map((v) => JSON.stringify(v)).join('\n')
      : JSON.stringify(value, null, 2);
  }

  if (format === 'application/x-www-form-urlencoded') {
    const params = new URLSearchParams();
    if (typeof value !== 'object')
      throw new Error(
        `For url encoded data, \`value\` must be an object, but received: ${typeof value}`,
      );

    for (const key in value) {
      if (value[key as keyof object]) params.set(key, String(value[key as keyof object]));
    }

    return params.toString();
  }

  return js2xml(value, { compact: true, spaces: 2 });
}

/**
 * Returns the input string wrapped in single quotes, escaping internal single quotes and backslashes.
 */
export function singleQuote(str: string): string {
  return `'${str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Returns the input string wrapped in double quotes, escaping internal double quotes and backslashes.
 */
export function doubleQuote(str: string): string {
  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Returns the input string wrapped in Python triple double-quotes,
 * escaping embedded triple quotes and backslashes.
 */
export function tripleDoubleQuote(str: string): string {
  // Escape \ first, then triple double quotes
  return `"""${str.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"')}"""`;
}

/**
 * Returns the input string wrapped in backticks, escaping internal backticks and backslashes.
 */
export function backtickQuote(str: string): string {
  return `\`${str.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}\``;
}

export function indent(code: string, tab: number = 1) {
  const p = '  '.repeat(tab);
  return code
    .split('\n')
    .map((v) => (v.length === 0 ? v : p + v))
    .join('\n');
}
