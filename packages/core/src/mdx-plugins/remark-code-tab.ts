import type { Processor, Transformer } from 'unified';
import type { Nodes, Root } from 'mdast';
import { parseCodeBlockAttributes } from '@/mdx-plugins/codeblock-utils';
import { toAttributeValue, walk } from '@/mdx-plugins/utils';
import { groupCodeTabs, type CodeTabType } from '../../../shared/code-tab';

export interface RemarkCodeTabOptions {
  Tabs?: CodeTabType;

  /**
   * Parse MDX in tab values
   *
   * @defaultValue false
   */
  parseMdx?: boolean;
}

declare module 'mdast' {
  export interface CodeData {
    /**
     * [Fumadocs: remark-code-tab] the associated tab value
     */
    tab?: string;
    /**
     * [Fumadocs: remark-code-tab] the associated tab group ID
     */
    tabGroup?: string;
  }
}

function readTab(node: Nodes) {
  if (node.type !== 'code' || !node.meta) return;
  const { attributes, rest } = parseCodeBlockAttributes(node.meta, ['tab', 'tab-group']);
  const { tab: value, 'tab-group': group } = attributes;
  if (typeof value !== 'string') return;

  node.data ??= {};
  node.data.tab = value;
  if (typeof group === 'string') node.data.tabGroup = group;
  return { value, group: node.data.tabGroup, meta: rest };
}

export function remarkCodeTab(
  this: Processor,
  { parseMdx = false, Tabs = 'CodeBlockTabs' }: RemarkCodeTabOptions = {},
): Transformer<Root, Root> {
  return (tree) => {
    walk<Nodes>(tree, (node) => {
      if (!('children' in node)) return 'skip';
      let type = Tabs;
      let withMdx = parseMdx;
      const inElement =
        node.type === 'mdxJsxFlowElement' &&
        (node.name === 'CodeBlockTabs' || node.name === 'Tabs');

      if (inElement) {
        type = node.name as CodeTabType;
        // for `Tabs` in simple mode, it doesn't support MDX tab names
        if (type === 'Tabs')
          withMdx &&= node.attributes.every(
            (attribute) => attribute.type !== 'mdxJsxAttribute' || attribute.name !== 'items',
          );
      }

      const children = groupCodeTabs<Nodes>(node.children, {
        type,
        inElement,
        tab: readTab,
        set(node, key, value) {
          (node as unknown as Record<string, unknown>)[key] = value;
        },
        title: withMdx ? (value) => mdxToAst(this, value) : undefined,
        expression: toAttributeValue,
      });
      if (children) node.children = children as typeof node.children;
    });
  };
}

/** the nodes of the MDX title of a tab */
function mdxToAst(processor: Processor, name: string): Nodes[] {
  const out: Nodes[] = [];
  // unwrap paragraphs only
  for (const child of (processor.parse(name) as Root).children) {
    if (child.type === 'paragraph') out.push(...child.children);
    else out.push(child);
  }
  // positions in the tab name, not the document
  for (const node of out)
    walk<Nodes>(node, (child) => {
      delete child.position;
    });
  return out;
}
