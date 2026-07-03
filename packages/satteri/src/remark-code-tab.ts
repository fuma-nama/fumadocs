import { defineMdastPlugin, type MdastNode, type MdastVisitorContext } from 'satteri';
import type { BlockContent, Code } from 'mdast';
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

function stripTabMeta(meta: string | null | undefined) {
  if (!meta) return meta ?? undefined;
  return parseCodeBlockAttributes(meta, ['tab', 'tab-group']).rest;
}

function processTabValue(nodes: Code[]) {
  const out = new Map<string, Code[]>();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const name = (node.data as { tab?: string } | undefined)?.tab ?? `Tab ${i + 1}`;
    const list = out.get(name) ?? [];
    list.push(node);
    out.set(name, list);
  }
  return out;
}

function mdxToAst(name: string): BlockContent[] {
  return [{ type: 'paragraph', children: [{ type: 'text', value: name }] }];
}

function buildTabs(
  tabs: Map<string, Code[]>,
  mode: TabType,
  withMdx: boolean,
  withParent: boolean,
): BlockContent[] {
  if (mode === 'CodeBlockTabs') {
    const options: CodeBlockTabsOptions = { triggers: [], tabs: [] };
    let isFirst = true;
    for (const [value, list] of tabs) {
      if (isFirst) {
        options.defaultValue = value;
        const tagGroup = list[0]?.data as { tabGroup?: string } | undefined;
        if (tagGroup?.tabGroup) options.persist = { id: tagGroup.tabGroup };
        isFirst = false;
      }
      options.triggers.push({
        value,
        children: withMdx ? mdxToAst(value) : [{ type: 'text', value }],
      });
      options.tabs.push({ value, children: list.map((code) => ({ ...code, meta: stripTabMeta(code.meta) })) });
    }
    const node = generateCodeBlockTabs(options);
    return (withParent ? [node] : node.children) as BlockContent[];
  }

  const entries = [...tabs.entries()];
  if (!withMdx) {
    const children = entries.map(([name, codes]) => ({
      type: 'mdxJsxFlowElement',
      name: 'Tab',
      attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: name }],
      children: codes,
    })) satisfies MdxJsxFlowElement[];
    return withParent
      ? [
          {
            type: 'mdxJsxFlowElement',
            name: 'Tabs',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'items',
                value: {
                  type: 'mdxJsxAttributeValueExpression',
                  value: entries.map(([name]) => name).join(', '),
                  data: {
                    estree: {
                      type: 'Program',
                      sourceType: 'module',
                      body: [
                        {
                          type: 'ExpressionStatement',
                          expression: {
                            type: 'ArrayExpression',
                            elements: entries.map(([name]) => ({
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
            children,
          },
        ]
      : children;
  }

  const children: MdxJsxFlowElement[] = [
    {
      type: 'mdxJsxFlowElement',
      name: 'TabsList',
      attributes: [],
      children: entries.map(([name]) => ({
        type: 'mdxJsxFlowElement',
        name: 'TabsTrigger',
        attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: name }],
        children: mdxToAst(name),
      })),
    },
    ...entries.map(
      ([name, codes]) =>
        ({
          type: 'mdxJsxFlowElement',
          name: 'TabsContent',
          attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: name }],
          children: codes,
        }) satisfies MdxJsxFlowElement,
    ),
  ];

  return withParent
    ? [
        {
          type: 'mdxJsxFlowElement',
          name: 'Tabs',
          attributes: [{ type: 'mdxJsxAttribute', name: 'defaultValue', value: entries[0]![0] }],
          children,
        },
      ]
    : children;
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

export function remarkCodeTab({ parseMdx = false, Tabs = 'CodeBlockTabs' }: RemarkCodeTabOptions = {}) {
  return defineMdastPlugin({
    name: 'remark-code-tab',
    code(node, ctx) {
      if (!node.meta || isInsideCodeBlockTabs(node, ctx)) return;
      const parent = ctx.parent(node);
      if (!parent || !('children' in parent)) return;

      const meta = parseCodeBlockAttributes(node.meta, ['tab', 'tab-group']);
      if (!meta.attributes.tab) return;

      const children = parent.children as Code[];
      const index = ctx.indexOf(node);
      if (index === undefined) return;

      let start = index;
      while (start > 0) {
        const prev = children[start - 1];
        if (prev?.type !== 'code' || !prev.meta) break;
        const prevMeta = parseCodeBlockAttributes(prev.meta, ['tab', 'tab-group']);
        if (!prevMeta.attributes.tab) break;
        start--;
      }

      if (index !== start) return;

      let end = index + 1;
      while (end < children.length) {
        const next = children[end];
        if (next?.type !== 'code' || !next.meta) break;
        const nextMeta = parseCodeBlockAttributes(next.meta, ['tab', 'tab-group']);
        if (!nextMeta.attributes.tab) break;
        end++;
      }

      const group = children.slice(start, end);
      for (const item of group) {
        const parsed = parseCodeBlockAttributes(item.meta!, ['tab', 'tab-group']);
        item.meta = parsed.rest;
        item.data ??= {};
        (item.data as { tab?: string; tabGroup?: string; _code_tab_visited?: true }).tab =
          parsed.attributes.tab ?? undefined;
        if (parsed.attributes['tab-group']) {
          (item.data as { tabGroup?: string }).tabGroup = parsed.attributes['tab-group'];
        }
      }

      const replacement = buildTabs(processTabValue(group), Tabs, parseMdx, true)[0]!;
      const tabMeta = (replacement.data ??= {}) as { _code_tab_visited?: true };
      tabMeta._code_tab_visited = true;
      ctx.replaceNode(node, replacement);
      for (let i = end - 1; i > start; i--) {
        ctx.removeChildAt(parent, i);
      }
    },
  });
}
