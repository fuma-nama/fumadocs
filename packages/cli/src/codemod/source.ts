import type { CallExpression } from 'oxc-parser';
import { addElements, find, getProperty, getStringValue, type SourceFile } from './shared';

function findCall(file: SourceFile, name: string): CallExpression | undefined {
  return find(
    file.program,
    'CallExpression',
    (node) => node.callee.type === 'Identifier' && node.callee.name === name,
  );
}

/** the call of the Fumadocs integration in an Astro config */
function findIntegration(file: SourceFile): CallExpression | undefined {
  for (const node of file.program.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== '@fumadocs/astro') continue;
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportDefaultSpecifier') return findCall(file, spec.local.name);
    }
  }
}

/**
 * Enable `includeProcessedMarkdown` on the `defineDocs()` call, or on the Fumadocs integration of an Astro config
 *
 * @returns `false` if the call cannot be found
 */
export function enableProcessedMarkdown(file: SourceFile): boolean {
  const integration = findIntegration(file);
  const call = integration ?? findCall(file, 'defineDocs');
  if (!call) return false;
  const flag = 'includeProcessedMarkdown: true';
  // Fumadocs MDX takes it in `docs.postprocess`
  const path = integration ? [] : ['docs', 'postprocess'];
  const nest = (keys: string[]) => {
    let item = flag;
    for (let i = keys.length - 1; i >= 0; i--)
      item = `${keys[i]}: {\n  ${item.replaceAll('\n', '\n  ')},\n}`;
    return item;
  };

  let options = call.arguments[0];
  if (!options) {
    file.s.appendLeft(call.end - 1, `{ ${nest(path)} }`);
    return true;
  }
  for (let i = 0; i < path.length; i++) {
    if (options.type !== 'ObjectExpression') return false;
    const value = getProperty(options, path[i])?.value;
    if (!value) {
      addElements(file, options, [nest(path.slice(i))]);
      return true;
    }
    options = value;
  }
  if (options.type !== 'ObjectExpression') return false;

  const existing = getProperty(options, 'includeProcessedMarkdown')?.value;
  if (!existing) addElements(file, options, [flag]);
  else if (existing.type === 'Literal' && existing.value === false)
    file.s.overwrite(existing.start, existing.end, 'true');
  return true;
}

/**
 * Set a string option of the Fumadocs integration in an Astro config, like the `layout` module, unless it is defined
 *
 * @returns the value of the option, `undefined` if the integration cannot be found or the option isn't a string
 */
export function ensureAstroOption(file: SourceFile, name: string, value: string) {
  const call = findIntegration(file);
  if (!call) return;
  const item = `${name}: '${value}'`;
  const options = call.arguments[0];
  if (!options) {
    file.s.appendLeft(call.end - 1, `{ ${item} }`);
    return value;
  }
  if (options.type !== 'ObjectExpression') return;

  const existing = getProperty(options, name)?.value;
  if (existing) return getStringValue(existing);
  addElements(file, options, [item]);
  return value;
}
