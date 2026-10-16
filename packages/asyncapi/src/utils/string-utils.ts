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
