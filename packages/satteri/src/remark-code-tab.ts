import { defineMdastPlugin, mdxToMdast, type MdastNode, type MdastVisitorContext } from 'satteri';
import type { Parents, Root } from 'mdast';
import { parseCodeBlockAttributes } from 'fumadocs-core/mdx-plugins/codeblock-utils';
import { groupCodeTabs, type CodeTabType } from '../../shared/code-tab';
import { listParent } from '../../shared/show';

export interface RemarkCodeTabOptions {
  Tabs?: CodeTabType;
  parseMdx?: boolean;
}

function readTab(node: MdastNode) {
  if (node.type !== 'code' || !node.meta) return;
  const { attributes, rest } = parseCodeBlockAttributes(node.meta, ['tab', 'tab-group']);
  const { tab: value, 'tab-group': group } = attributes;
  if (typeof value !== 'string' || !value) return;

  return { value, group: typeof group === 'string' ? group : undefined, meta: rest || undefined };
}

function parseTabName(name: string): MdastNode[] {
  try {
    // unwrap paragraphs only
    const children = ((mdxToMdast(name, { position: false }) as Root).children ?? []).flatMap(
      (child) => (child.type === 'paragraph' ? child.children : child),
    );
    if (children.length > 0) return children as MdastNode[];
  } catch {}

  return [{ type: 'text', value: name }];
}

/** author-written tab containers whose code blocks are already grouped */
const TAB_CONTAINERS = new Set([
  'CodeBlockTabs',
  'CodeBlockTab',
  'CodeBlockTabsList',
  'CodeBlockTabsTrigger',
]);

function isInsideTabContainer(node: MdastNode, ctx: MdastVisitorContext) {
  let parent = ctx.parent(node as never) as MdastNode | undefined;
  while (parent) {
    if (parent.type === 'mdxJsxFlowElement' && TAB_CONTAINERS.has(parent.name ?? '')) {
      return true;
    }
    parent = ctx.parent(parent as never) as MdastNode | undefined;
  }
  return false;
}

export function remarkCodeTab({
  parseMdx = false,
  Tabs = 'CodeBlockTabs',
}: RemarkCodeTabOptions = {}) {
  // the `code` visitor only collects parents (the Set dedupes sibling visits
  // by identity), and the `after` hook rebuilds each one exactly once
  return () => {
    const parents = new Set<Parents>();

    return defineMdastPlugin({
      name: 'remark-code-tab',
      code(node, ctx) {
        if (!readTab(node) || isInsideTabContainer(node, ctx)) return;
        const parent = listParent<MdastNode>(node, ctx);
        if (parent && 'children' in parent) parents.add(parent as Parents);
      },
      after(_root, ctx) {
        for (const parent of parents) {
          const children = groupCodeTabs<MdastNode>(parent.children as MdastNode[], {
            type: Tabs,
            tab: readTab,
            set: (node, key, value) => ctx.setProperty(node, key as never, value as never),
            title: parseMdx ? parseTabName : undefined,
            // satteri compiles the expression from its `value` source
            expression: (value) => ({ type: 'mdxJsxAttributeValueExpression', value }),
          });
          if (children) ctx.setProperty(parent, 'children', children as never);
        }
      },
    });
  };
}
