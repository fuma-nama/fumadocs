import { defineMdastPlugin, mdxToMdast, type MdastNode, type MdastVisitorContext } from 'satteri';
import type { BlockContent, Code, Parents } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import {
  generateCodeBlockTabs,
  parseCodeBlockAttributes,
  type CodeBlockTabsOptions,
} from 'fumadocs-core/mdx-plugins/codeblock-utils';

type TabType = 'CodeBlockTabs' | 'Tabs';

export interface RemarkCodeTabOptions {
  Tabs?: TabType;
  parseMdx?: boolean;
}

interface TabEntry {
  name: string;
  tabGroup?: string;
  codes: Code[];
}

function parseTabAttributes(node: MdastNode | undefined) {
  if (!node || node.type !== 'code' || !node.meta) return;
  const parsed = parseCodeBlockAttributes(node.meta, ['tab', 'tab-group']);
  if (!parsed.attributes.tab) return;
  return parsed;
}

function buildTabs(
  _ctx: MdastVisitorContext,
  entries: TabEntry[],
  mode: TabType,
  withMdx: boolean,
): BlockContent {
  if (mode === 'CodeBlockTabs') {
    const options: CodeBlockTabsOptions = {
      triggers: [],
      tabs: [],
      defaultValue: entries[0]!.name,
    };
    if (entries[0]!.tabGroup) options.persist = { id: entries[0]!.tabGroup };

    for (const { name, codes } of entries) {
      options.triggers.push({
        value: name,
        // @ts-expect-error -- get nodes inside <p>, must clone the output because it outputs a getter, which becomes something else when it is actually returned to satteri itself
        children: structuredClone(mdxToMdast(name)).children[0].children,
      });
      options.tabs.push({ value: name, children: codes });
    }
    return generateCodeBlockTabs(options) as BlockContent;
  }

  if (!withMdx) {
    return {
      type: 'mdxJsxFlowElement',
      name: 'Tabs',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'items',
          value: {
            type: 'mdxJsxAttributeValueExpression',
            value: entries.map(({ name }) => name).join(', '),
            data: {
              estree: {
                type: 'Program',
                sourceType: 'module',
                body: [
                  {
                    type: 'ExpressionStatement',
                    expression: {
                      type: 'ArrayExpression',
                      elements: entries.map(({ name }) => ({
                        type: 'Literal',
                        value: name,
                      })),
                    },
                  },
                ],
              },
            },
          },
        },
      ],
      children: entries.map(
        ({ name, codes }) =>
          ({
            type: 'mdxJsxFlowElement',
            name: 'Tab',
            attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: name }],
            children: codes,
          }) satisfies MdxJsxFlowElement,
      ),
    } as MdxJsxFlowElement as BlockContent;
  }

  const children: MdxJsxFlowElement[] = [
    {
      type: 'mdxJsxFlowElement',
      name: 'TabsList',
      attributes: [],
      children: entries.map(({ name }) => ({
        type: 'mdxJsxFlowElement',
        name: 'TabsTrigger',
        attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: name }],
        children: withMdx
          ? [mdxToMdast(name) as never]
          : [{ type: 'paragraph', children: [{ type: 'text', value: name }] }],
      })),
    },
  ];
  for (const { name, codes } of entries) {
    children.push({
      type: 'mdxJsxFlowElement',
      name: 'TabsContent',
      attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: name }],
      children: codes,
    });
  }

  return {
    type: 'mdxJsxFlowElement',
    name: 'Tabs',
    attributes: [{ type: 'mdxJsxAttribute', name: 'defaultValue', value: entries[0]!.name }],
    children,
  } as MdxJsxFlowElement as BlockContent;
}

function isInsideCodeBlockTabs(node: Code, ctx: MdastVisitorContext) {
  let parent = ctx.parent(node);
  while (parent) {
    if (
      parent.type === 'mdxJsxFlowElement' &&
      ['CodeBlockTabs', 'CodeBlockTab', 'CodeBlockTabsList', 'CodeBlockTabsTrigger'].includes(
        parent.name ?? '',
      )
    ) {
      return true;
    }
    const next = ctx.parent(parent as MdastNode);
    if (!next) break;
    parent = next;
  }
  return false;
}

export function remarkCodeTab({
  parseMdx = false,
  Tabs = 'CodeBlockTabs',
}: RemarkCodeTabOptions = {}) {
  // Satteri applies queued tree mutations after the pass and may hand each
  // visit a fresh materialization of the node, so sibling visits can't observe
  // in-place JS mutations. Track handled group members by (parent, index)
  // instead, in per-compile state (factory form).
  return () => {
    const processed = new WeakMap<Readonly<Parents>, Set<number>>();

    return defineMdastPlugin({
      name: 'remark-code-tab',
      code(node, ctx) {
        if (!node.meta || isInsideCodeBlockTabs(node, ctx)) return;
        const parent = ctx.parent(node);
        if (!parent || !('children' in parent)) return;
        const index = ctx.indexOf(node);
        if (index === undefined) return;
        if (processed.get(parent)?.has(index)) return;
        if (!parseTabAttributes(node)) return;

        const children = parent.children;
        let start = index;
        while (start > 0 && parseTabAttributes(children[start - 1])) {
          start--;
        }
        // only the first code block of a group builds the tabs
        if (index !== start) return;

        let end = index + 1;
        while (end < children.length && parseTabAttributes(children[end])) {
          end++;
        }

        const marked = processed.get(parent) ?? new Set<number>();
        for (let i = start; i < end; i++) marked.add(i);
        processed.set(parent, marked);

        const entries: TabEntry[] = [];
        for (let i = start; i < end; i++) {
          const item = children[i] as Code;
          const parsed = parseTabAttributes(item)!;
          const name = parsed.attributes.tab ?? `Tab ${i - start + 1}`;
          const copy: Code = { ...item, meta: parsed.rest || undefined };

          const existing = entries.find((entry) => entry.name === name);
          if (existing) {
            existing.codes.push(copy);
          } else {
            entries.push({
              name,
              tabGroup: parsed.attributes['tab-group'] ?? undefined,
              codes: [copy],
            });
          }
        }

        ctx.replaceNode(node, buildTabs(ctx, entries, Tabs, parseMdx));
        for (let i = end - 1; i > start; i--) {
          ctx.removeChildAt(parent, i);
        }
      },
    });
  };
}
