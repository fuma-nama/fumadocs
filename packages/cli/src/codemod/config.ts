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
 * Add a plugin call to an array of a config file, like the `plugins` of Vite or the `integrations` of Astro, skip if the same plugin is already added.
 *
 * @param path - property path to the array, e.g. `['vite', 'plugins']` for Waku, missing objects on it are created
 */
export function addVitePlugin(
  file: SourceFile,
  plugin: {
    name: string;
    from: string;
    call?: string;
    /** imported as the default export */
    default?: boolean;
  },
  path: string[] = ['plugins'],
): boolean {
  let object = getConfigObject(file);
  let depth = 0;
  for (; object && depth < path.length - 1; depth++) {
    let value = getProperty(object, path[depth])?.value;
    if (!value) break;
    // e.g. `vite: { ... } satisfies UserConfig as Config['vite']`
    while (value.type === 'TSSatisfiesExpression' || value.type === 'TSAsExpression')
      value = value.expression;
    object = value.type === 'ObjectExpression' ? value : undefined;
  }
  if (!object) return false;

  const call = plugin.call ?? `${plugin.name}()`;
  const plugins = getProperty(object, path[depth])?.value;
  if (!plugins) {
    // e.g. `vite: { plugins: [tailwindcss()] }`
    let item = `[${call}]`;
    for (let i = path.length - 1; i > depth; i--) item = `{ ${path[i]}: ${item} }`;
    addElements(file, object, [`${path[depth]}: ${item}`]);
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

  addImport(
    file,
    plugin.default
      ? { from: plugin.from, default: plugin.name }
      : { from: plugin.from, named: [plugin.name] },
  );
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

/**
 * Add rewrites to a Next.js config, skip if `rewrites` is already defined
 */
export function addNextRewrites(
  file: SourceFile,
  rewrites: { source: string; destination: string }[],
): boolean {
  const config = getConfigObject(file);
  if (!config) return false;
  if (getProperty(config, 'rewrites')) return false;

  const items = rewrites.map(
    ({ source, destination }) =>
      `    {\n      source: '${source}',\n      destination: '${destination}',\n    },`,
  );
  addElements(file, config, [`async rewrites() {\n  return [\n${items.join('\n')}\n  ];\n}`]);
  return true;
}
