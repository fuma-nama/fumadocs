import type { CallExpression } from 'oxc-parser';
import {
  addElements,
  find,
  getCodeValue,
  getDefaultExport,
  getProperty,
  type SourceFile,
} from '@/transform/shared';

/**
 * Add path to the `pages` array in tanstack start vite config.
 *
 * If the `pages` property doesn't exist, create one.
 */
export function addTanstackPrerender(file: SourceFile, paths: string[]) {
  const options = getTanstackStartCall(file)?.arguments[0];
  if (options?.type !== 'ObjectExpression') return;

  const toItem = (path: string) => `{ path: '${path}' }`;
  const pages = getProperty(options, 'pages')?.value;
  if (!pages) {
    addElements(file, options, [
      `pages: [\n${paths.map((path) => `  ${toItem(path)}`).join(',\n')}\n]`,
    ]);
    return;
  }
  if (pages.type !== 'ArrayExpression') return;

  const existingPaths = new Set<string>();
  for (const element of pages.elements) {
    const value = element?.type === 'ObjectExpression' && getProperty(element, 'path')?.value;
    if (value) existingPaths.add(getCodeValue(file.code.slice(value.start, value.end)));
  }
  addElements(file, pages, paths.filter((path) => !existingPaths.has(path)).map(toItem));
}

/**
 * Find the tanstackStart call expression
 */
function getTanstackStartCall(file: SourceFile): CallExpression | undefined {
  const exported = getDefaultExport(file);
  const options = exported && find(exported, 'ObjectExpression');
  const plugins = options && getProperty(options, 'plugins')?.value;
  if (plugins?.type !== 'ArrayExpression') return;

  for (const element of plugins.elements) {
    if (
      element?.type === 'CallExpression' &&
      element.callee.type === 'Identifier' &&
      element.callee.name === 'tanstackStart'
    )
      return element;
  }
}
