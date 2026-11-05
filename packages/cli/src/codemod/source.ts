import { addElements, find, getProperty, type SourceFile } from './shared';

/**
 * Enable `includeProcessedMarkdown` on the `defineDocs()` call, or on the Fumadocs integration of an Astro config
 *
 * @returns `false` if the call cannot be found
 */
export function enableProcessedMarkdown(file: SourceFile): boolean {
  let integration: string | undefined;
  for (const node of file.program.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== '@fumadocs/astro') continue;
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportDefaultSpecifier') integration = spec.local.name;
    }
  }
  const call = find(
    file.program,
    'CallExpression',
    (node) =>
      node.callee.type === 'Identifier' && node.callee.name === (integration ?? 'defineDocs'),
  );
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
