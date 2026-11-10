/** the element of a branch of `<show>`, defined in the module by {@link showDeclaration} */
export const showElement = '_Show';

/** the ESM code that defines {@link showElement} */
export const showDeclaration = `export function ${showElement}(props) { return props.when ? props.children : null }`;

/** the attributes of a JSX element, in mdast and Sätteri */
export type JsxAttributes = (
  | { type: 'mdxJsxAttribute'; name: string; value?: string | { value: string } | null }
  | { type: 'mdxJsxExpressionAttribute'; value: string }
)[];

/** the condition of a branch of `<show>`, code checked when rendering */
export function showCondition(node: object): string | undefined {
  const { name, attributes } = node as { name?: unknown; attributes?: unknown };
  if (name !== showElement) return;
  for (const attr of attributes as JsxAttributes)
    if (attr.type === 'mdxJsxAttribute' && attr.name === 'when' && typeof attr.value === 'object')
      return attr.value?.value;
}

/**
 * The conditions of the branches around a node, outermost first, for trees that give the parent of a node. A document
 * without branches doesn't read its parents, see `_show` of `remarkShow`.
 */
export function showConditions(
  node: object,
  ctx: { data: object; parent: (node: never) => object | undefined },
): string[] {
  const out: string[] = [];
  if (!(ctx.data as { _show?: boolean })._show) return out;
  for (let p = ctx.parent(node as never); p; p = ctx.parent(p as never)) {
    const condition = showCondition(p);
    if (condition) out.unshift(condition);
  }
  return out;
}

/**
 * Visit a tree in document order, with the conditions of the branches around each node, outermost first. Returning
 * `skip` skips the children of a node, a visitor can remove the node it visits from `parent`.
 */
export function walkBranches<N extends { type: string; children?: N[] }>(
  node: N,
  visitor: (node: N, when: string[], parent: N | undefined) => 'skip' | void,
  when: string[] = [],
  parent?: N,
): void {
  if (visitor(node, when, parent) === 'skip' || !node.children) return;
  const condition = showCondition(node);
  if (condition) when = [...when, condition];
  const { children } = node;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    walkBranches(child, visitor, when, node);
    if (children[i] !== child) i--;
  }
}

/**
 * Whether the outputs of a document are static: values analysed from the source, which can't tell the branches that
 * show nor read props. A document with branches has no static outputs.
 *
 * @param isStatic - by default, unless the content source of the document renders its pages for props
 */
export function isStaticOutput(
  data: { unstable_runtimeOutputs?: boolean; _show?: boolean },
  isStatic = !data.unstable_runtimeOutputs,
): boolean {
  if (isStatic && data._show)
    throw new Error(
      "`<show>` is checked when rendering, but the outputs of this document are static: its content source doesn't set `unstable_runtimeOutputs` in the data of the file, or processed Markdown has `output: 'string'`.",
    );
  return isStatic;
}
