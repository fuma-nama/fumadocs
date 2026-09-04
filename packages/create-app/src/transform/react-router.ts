import type { ArrayExpression, ObjectProperty } from 'oxc-parser';
import {
  addElements,
  filterElements,
  find,
  findAll,
  getCodeValue,
  getProperty,
  type SourceFile,
} from '@/transform/shared';

/**
 * filter items in a specific array initializer in the prerender function
 */
export function filterReactRouterPrerenderArray(
  file: SourceFile,
  array: 'paths' | 'excluded',
  filter: (item: string) => boolean,
) {
  const method = getPrerenderMethod(file);
  if (!method) return;

  const initializer = findAll(method.value, 'VariableDeclarator').find(
    (item) => item.id.type === 'Identifier' && item.id.name === array,
  )?.init;
  if (initializer?.type !== 'ArrayExpression') return;

  filterElements(file, initializer, (element) =>
    filter(getCodeValue(file.code.slice(element.start, element.end))),
  );
}

/**
 * Add a new route to route config
 */
export function addReactRouterRoute(file: SourceFile, routes: { path: string; entry: string }[]) {
  modifyReactRouterRoutes(file, (arr) => {
    addElements(
      file,
      arr,
      routes.map(({ path, entry }) => `route('${path}', '${entry}')`),
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

      return filter({
        path: getCodeValue(file.code.slice(args[0].start, args[0].end)),
        entry: getCodeValue(file.code.slice(args[1].start, args[1].end)),
      });
    });
  });
}

export function modifyReactRouterRoutes(file: SourceFile, mod: (array: ArrayExpression) => void) {
  const initializer = getDefaultExport(file) && find(getDefaultExport(file)!, 'ArrayExpression');
  if (initializer) mod(initializer);
}

function getDefaultExport(file: SourceFile) {
  return file.program.body.find((node) => node.type === 'ExportDefaultDeclaration');
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
