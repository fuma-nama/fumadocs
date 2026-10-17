// @ts-expect-error -- nothing
import js2xml from 'xml-js/lib/js2xml';

/**
 * The text of a body value in the format of a media type, strings are already serialized.
 */
export function inputToString(value: unknown, format = 'application/json'): string {
  if (typeof value === 'string') return value;

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

  if (format === 'application/xml') return js2xml(value, { compact: true, spaces: 2 });

  return JSON.stringify(value, null, 2);
}

/**
 * Returns the value of a `Cookie` header with the given cookies.
 */
export function cookieString(cookies: Record<string, { value: string }>): string {
  let out = '';
  for (const k in cookies) out += `${out ? '; ' : ''}${k}=${cookies[k].value}`;
  return out;
}

/**
 * Returns the input string wrapped in double quotes, escaping internal double quotes and backslashes.
 */
export function doubleQuote(str: string): string {
  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * A JSX attribute value, strings don't process escapes, an expression holds the ones with quotes.
 */
export function jsxString(str: string): string {
  return str.includes('"') ? `{${JSON.stringify(str)}}` : `"${str}"`;
}

export function indent(code: string, tab: number = 1) {
  const p = '  '.repeat(tab);
  return code
    .split('\n')
    .map((v) => (v.length === 0 ? v : p + v))
    .join('\n');
}
