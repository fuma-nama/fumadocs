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

/** an item of a list of siblings, with the conditions of the branches around it */
export interface ListItem<N, T> {
  node: N;
  /** what the test of the list read from the node */
  data: T;
  when: string[];
}

const none: string[] = [];

/**
 * Group the lists among sibling nodes, like steps and the tabs of code blocks. A branch doesn't break a list: the nodes
 * inside it are nodes of the list around it, unless one of them ends the list. A list has an item outside branches, a
 * branch groups the lists inside it otherwise.
 *
 * @param test - read a node as an item of the list, `false` ends the list and the nodes without a result are its
 *   content. `first` is the first item of the list
 * @param build - the nodes that replace the nodes of a list
 * @param setChildren - set the children of a branch, trees differ in how a node is edited
 * @returns the siblings, `undefined` without a list
 */
export function groupLists<N extends { type: string; children?: N[] }, T extends object>(
  children: N[],
  test: (node: N, first: N | undefined) => T | false | void,
  build: (nodes: N[], items: ListItem<N, T>[]) => N[],
  setChildren: (branch: N, children: N[]) => void,
): N[] | undefined {
  const out: N[] = [];
  /** the nodes before it are in `out` */
  let done = 0;
  let changed = false;
  let branches = false;
  let start = -1;
  let items: ListItem<N, T>[] = [];
  let direct = false;
  let ends = false;

  const visit = (node: N, when: string[]) => {
    if (showCondition(node)) {
      branches = true;
      return;
    }
    const result = ends ? undefined : test(node, items[0]?.node);
    if (result) items.push({ node, data: result, when });
    else if (result === false) ends = true;
    return 'skip' as const;
  };
  /** the nodes outside lists stay, a branch groups the lists inside it */
  const keep = (end: number) => {
    for (; done < end; done++) {
      const node = children[done];
      const inner = showCondition(node) && groupLists(node.children!, test, build, setChildren);
      if (inner) {
        setChildren(node, inner);
        changed = true;
      }
      out.push(node);
    }
  };
  const close = (end: number) => {
    if (direct) {
      keep(start);
      for (const node of build(children.slice(start, end), items)) out.push(node);
      done = end;
      changed = true;
    }
    start = -1;
    items = [];
    direct = false;
  };

  for (let i = 0; i < children.length; i++) {
    const count = items.length;
    ends = false;
    walkBranches(children[i], visit, none);
    if (ends) {
      items.length = count;
      // the node may start another list
      if (start !== -1) {
        close(i);
        i--;
      }
      continue;
    }
    if (items.length === count) continue;
    if (start === -1) start = i;
    direct ||= items[count].when.length === 0;
  }
  close(children.length);
  if (!changed && !branches) return;
  keep(children.length);
  if (changed) return out;
}

/**
 * The parent of the list a node is in: its nearest parent that isn't a branch, for trees that give the parent of a
 * node.
 */
export function listParent<P extends object>(
  node: object,
  ctx: { parent: (node: never) => P | undefined },
): P | undefined {
  let parent = ctx.parent(node as never);
  while (parent && showCondition(parent)) parent = ctx.parent(parent as never);
  return parent;
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
