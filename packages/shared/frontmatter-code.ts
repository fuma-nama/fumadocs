/** a node of ESTree, from acorn or yuku */
interface EsmNode {
  type: string;
  specifiers?: readonly { local: { name?: string } }[];
  declaration?: EsmNode | null;
  declarations?: readonly (EsmNode & { id: { type: string; name?: string } })[];
}

/**
 * The frontmatter in code of an ESM block, `export const frontmatter = ...`, as the module of `frontmatter(props = {})`:
 * with the imports it reads and the exports before it in the block. `remove` is what to leave out of the content.
 *
 * @param imports - the imports of the document with their code, they are hoisted
 */
export function frontmatterModule(
  source: string,
  block: readonly object[],
  imports: [object, string][],
  range: (node: never) => [number, number],
): { module: string; remove: [number, number] } | undefined {
  let body = '';
  const declarations: EsmNode[] = [];
  for (const statement of block as EsmNode[]) {
    const { declaration } = statement;
    if (statement.type !== 'ExportNamedDeclaration' || !declaration) continue;
    // the declarations of exports run without `export`, like `export const name = ...`
    body += `${source.slice(...range(declaration as never))}\n`;
    declarations.push(declaration);
    const [first, second] = declaration.declarations ?? [];
    if (first?.id.type !== 'Identifier' || first.id.name !== 'frontmatter') continue;

    // only the imports it reads, the others are for the content, like components
    const names = new Set<string>();
    collectNames(declarations, names);
    let code = '';
    for (const [item, text] of imports as [EsmNode, string][])
      if (item.specifiers?.some(({ local }) => local.name && names.has(local.name)))
        code += `${text}\n`;
    return {
      module: `${code}export const frontmatter = (props = {}) => {\n${body}return frontmatter;\n};`,
      // the other declarators of the statement stay
      remove: second
        ? [range(first as never)[0], range(second as never)[0]]
        : range(statement as never),
    };
  }
}

function collectNames(node: unknown, out: Set<string>) {
  if (typeof node !== 'object' || node === null) return;
  if ('type' in node && node.type === 'Identifier' && 'name' in node) out.add(node.name as string);
  for (const value of Object.values(node)) collectNames(value, out);
}
