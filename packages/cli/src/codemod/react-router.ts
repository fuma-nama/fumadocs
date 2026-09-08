import type { ArrayExpression, ObjectProperty } from 'oxc-parser';
import {
  addElements,
  filterElements,
  find,
  getStringValue,
  getDefaultExport,
  getProperty,
  type SourceFile,
} from '@/codemod/shared';

/**
 * filter items in a specific array initializer in the prerender function
 */
export function filterReactRouterPrerenderArray(
  file: SourceFile,
  array: 'paths' | 'excluded',
  filter: (item: string) => boolean,
) {
  const initializer = getPrerenderArray(file, array);
  if (!initializer) return;

  filterElements(file, initializer, (element) => {
    const value = getStringValue(element);
    return value === undefined || filter(value);
  });
}

/**
 * add items to a specific array initializer in the prerender function, skip existing ones
 */
export function addReactRouterPrerenderArray(
  file: SourceFile,
  array: 'paths' | 'excluded',
  items: string[],
) {
  const initializer = getPrerenderArray(file, array);
  if (!initializer) return;

  const existing = new Set<string>();
  for (const element of initializer.elements) {
    const value = element ? getStringValue(element) : undefined;
    if (value !== undefined) existing.add(value);
  }
  addElements(
    file,
    initializer,
    items.filter((item) => !existing.has(item)).map((item) => `'${item}'`),
  );
}

function getPrerenderArray(file: SourceFile, array: string): ArrayExpression | undefined {
  const method = getPrerenderMethod(file);
  if (!method) return;

  const initializer = find(
    method.value,
    'VariableDeclarator',
    (item) => item.id.type === 'Identifier' && item.id.name === array,
  )?.init;
  if (initializer?.type === 'ArrayExpression') return initializer;
}

/**
 * Add new routes to route config, an item can be raw code (e.g. `layout(...)`)
 */
export function addReactRouterRoute(
  file: SourceFile,
  routes: ({ path: string; entry: string } | string)[],
): boolean {
  return modifyReactRouterRoutes(file, (arr) => {
    addElements(
      file,
      arr,
      routes.map((item) =>
        typeof item === 'string' ? item : `route('${item.path}', '${item.entry}')`,
      ),
    );
  });
}

/**
 * Remove routes from route config (root level only)
 */
export function filterReactRouterRoute(
  file: SourceFile,
  filter: (item: { path: string; entry: string }) => boolean,
) {
  modifyReactRouterRoutes(file, (arr) => {
    filterElements(file, arr, (element) => {
      if (element.type !== 'CallExpression') return true;
      const { callee, arguments: args } = element;
      if (callee.type !== 'Identifier' || callee.name !== 'route') return true;

      const path = getStringValue(args[0]);
      const entry = getStringValue(args[1]);
      return path === undefined || entry === undefined || filter({ path, entry });
    });
  });
}

/** @returns `false` if the route config isn't an array literal (e.g. file-based routes) */
function modifyReactRouterRoutes(file: SourceFile, mod: (array: ArrayExpression) => void): boolean {
  const exported = getDefaultExport(file);
  const initializer = exported && find(exported, 'ArrayExpression');
  if (!initializer) return false;
  mod(initializer);
  return true;
}

/**
 * Find the prerender method from the config
 */
function getPrerenderMethod(file: SourceFile): ObjectProperty | undefined {
  const exported = getDefaultExport(file);
  const options = exported && find(exported, 'ObjectExpression');
  const property = options && getProperty(options, 'prerender');
  if (property?.method) return property;
}
