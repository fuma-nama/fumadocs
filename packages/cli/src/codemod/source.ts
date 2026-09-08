import { addElements, find, getProperty, type SourceFile } from './shared';

/**
 * Enable `includeProcessedMarkdown` on the `defineDocs()` call
 *
 * @returns `false` if the call cannot be found
 */
export function enableProcessedMarkdown(file: SourceFile): boolean {
  const call = find(
    file.program,
    'CallExpression',
    (node) => node.callee.type === 'Identifier' && node.callee.name === 'defineDocs',
  );
  const options = call?.arguments[0];
  if (options?.type !== 'ObjectExpression') return false;
  const flag = 'includeProcessedMarkdown: true';

  const docs = getProperty(options, 'docs')?.value;
  if (!docs) {
    addElements(file, options, [`docs: {\n  postprocess: {\n    ${flag},\n  },\n}`]);
    return true;
  }
  if (docs.type !== 'ObjectExpression') return false;

  const postprocess = getProperty(docs, 'postprocess')?.value;
  if (!postprocess) {
    addElements(file, docs, [`postprocess: {\n  ${flag},\n}`]);
    return true;
  }
  if (postprocess.type !== 'ObjectExpression') return false;

  const existing = getProperty(postprocess, 'includeProcessedMarkdown')?.value;
  if (!existing) addElements(file, postprocess, [flag]);
  else if (existing.type === 'Literal' && existing.value === false)
    file.s.overwrite(existing.start, existing.end, 'true');
  return true;
}
