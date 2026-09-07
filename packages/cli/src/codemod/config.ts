import type { Expression, ObjectExpression } from 'oxc-parser';
import {
  addElements,
  addImport,
  find,
  getDefaultExport,
  getProperty,
  type SourceFile,
} from './shared';

/**
 * The options object of a config file, e.g. the argument of `defineConfig({ ... })`, or the object in `export default { ... }`
 */
export function getConfigObject(file: SourceFile): ObjectExpression | undefined {
  const exported = getDefaultExport(file);
  if (!exported) return;
  let expr = exported.declaration as Expression;

  while (true) {
    if (expr.type === 'ObjectExpression') return expr;
    if (expr.type === 'TSSatisfiesExpression' || expr.type === 'TSAsExpression') {
      expr = expr.expression;
    } else if (expr.type === 'CallExpression' && expr.arguments.length > 0) {
      const arg = expr.arguments[0];
      if (arg.type === 'SpreadElement') return;
      expr = arg;
    } else if (expr.type === 'Identifier') {
      const { name } = expr;
      const init = find(
        file.program,
        'VariableDeclarator',
        (node) => node.id.type === 'Identifier' && node.id.name === name,
      )?.init;
      if (!init) return;
      expr = init;
    } else {
      return;
    }
  }
}

/**
 * Add a plugin call to the `plugins` array of a Vite config, skip if the same plugin is already added.
 *
 * @param path - property path to the plugins array, e.g. `['vite', 'plugins']` for Waku
 */
export function addVitePlugin(
  file: SourceFile,
  plugin: { name: string; from: string; call?: string },
  path: string[] = ['plugins'],
): boolean {
  let object = getConfigObject(file);
  for (let i = 0; object && i < path.length - 1; i++) {
    const value = getProperty(object, path[i])?.value;
    object = value?.type === 'ObjectExpression' ? value : undefined;
  }
  if (!object) return false;

  const call = plugin.call ?? `${plugin.name}()`;
  const plugins = getProperty(object, path[path.length - 1])?.value;
  if (!plugins) {
    addElements(file, object, [`${path[path.length - 1]}: [${call}]`]);
  } else if (plugins.type === 'ArrayExpression') {
    for (const element of plugins.elements) {
      if (
        element?.type === 'CallExpression' &&
        element.callee.type === 'Identifier' &&
        element.callee.name === plugin.name
      )
        return true;
    }
    addElements(file, plugins, [call]);
  } else {
    return false;
  }

  addImport(file, { from: plugin.from, named: [plugin.name] });
  return true;
}

/**
 * Wrap the default export of `next.config.*` with `createMDX()`
 */
export function wrapNextConfig(file: SourceFile): boolean {
  if (file.code.includes('fumadocs-mdx/next')) return true;
  const exported = getDefaultExport(file);
  if (!exported) return false;
  const { declaration, start } = exported;
  if (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration')
    return false;

  file.s.prependLeft(start, `const withMDX = createMDX();\n\n`);
  file.s.appendLeft(declaration.start, 'withMDX(');
  file.s.appendRight(declaration.end, ')');
  addImport(file, { from: 'fumadocs-mdx/next', named: ['createMDX'] });
  return true;
}
