import { addElements, find, getProperty, type SourceFile } from './shared';

/**
 * Add patterns to the `matcher` of `export const config` in a Next.js proxy (middleware) file
 */
export function addProxyMatcher(file: SourceFile, patterns: string[]): boolean {
  const config = find(
    file.program,
    'VariableDeclarator',
    (node) => node.id.type === 'Identifier' && node.id.name === 'config',
  )?.init;
  if (config?.type !== 'ObjectExpression') return false;
  const matcher = getProperty(config, 'matcher')?.value;
  if (matcher?.type !== 'ArrayExpression') return false;

  const existing = new Set<string>();
  for (const element of matcher.elements) {
    if (element?.type === 'Literal' && typeof element.value === 'string')
      existing.add(element.value);
  }
  addElements(
    file,
    matcher,
    patterns.filter((pattern) => !existing.has(pattern)).map((pattern) => `'${pattern}'`),
  );
  return true;
}
