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
      if (value[key as keyof object])
        params.set(key, String(value[key as keyof object]));
    }

    return params.toString();
  }

  return js2xml(value, { compact: true, spaces: 2 });
}

export function escapeString(str: string, delimit?: string): string {
  if (!delimit) return JSON.stringify(str);

  return `${delimit}${str.replaceAll(delimit, `\\${delimit}`)}${delimit}`;
}
