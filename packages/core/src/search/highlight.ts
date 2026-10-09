export function buildRegexFromQuery(query: string): RegExp | null {
  const source = query
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '|');
  return source ? new RegExp(source, 'gi') : null;
}
