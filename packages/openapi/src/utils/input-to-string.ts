import { type ElementCompact, js2xml } from 'xml-js';

/**
 * Convert input value to hardcoded string (with quotes)
 */
export function inputToString(
  value: unknown,
  mediaType = 'application/json',
  multiLine: 'single-quote' | 'backtick' | 'none' = 'none',
): string {
  const getStr = (v: string) => {
    if (multiLine === 'none') return JSON.stringify(v);

    const delimit = multiLine === 'backtick' ? `\`` : `'`;
    return `${delimit}${v.replaceAll(delimit, `\\${delimit}`)}${delimit}`;
  };

  if (typeof value === 'string') return getStr(value);

  if (mediaType === 'application/json' || mediaType === 'multipart/form-data') {
    return getStr(JSON.stringify(value, null, 2));
  }

  if (mediaType === 'application/xml') {
    return getStr(
      js2xml(value as ElementCompact, { compact: true, spaces: 2 }),
    );
  }

  throw new Error(`Unsupported media type: ${mediaType}`);
}
