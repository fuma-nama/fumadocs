/**
 * Returns the input string wrapped in double quotes, escaping internal double quotes and backslashes.
 */
export function doubleQuote(str: string): string {
  return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
