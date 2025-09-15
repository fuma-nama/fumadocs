import type { Processor, Transformer } from 'unified';
import type { BlockContent, Code, DefinitionContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import {
  generateCodeBlockTabs,
  parseCodeBlockAttributes,
} from '@/mdx-plugins/codeblock-utils';

type TabType = keyof typeof Types;
export interface RemarkCodeTabOptions {
  Tabs?: TabType;

  /**
   * Parse MDX in tab values
   *
   * @defaultValue false
   */
  parseMdx?: boolean;
}

declare module 'mdast' {
  export interface CodeData {
    tab?: string;
  }
}

const Tabs = {
  convert(
    processor: Processor,
    nodes: Code[],
    withMdx = false,
    withParent = true,
  ): MdxJsxFlowElement {
    const tabs = Array.from(processTabValue(nodes).entries());

    if (!withMdx) {
      const children: MdxJsxFlowElement[] = tabs.map(([name, codes]) => {
        return {
          type: 'mdxJsxFlowElement',
          name: 'Tab',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'value',
              value: name,
            },
          ],
          children: codes,
        };
      });

      if (!withParent) return createFragment(children);

      return {
        type: 'mdxJsxFlowElement',
        name: 'Tabs',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'items',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: tabs.map(([name]) => name).join(', '),
              data: {
                estree: {
                  type: 'Program',
                  sourceType: 'module',
                  comments: [],
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: {
                        type: 'ArrayExpression',
                        elements: tabs.map(([name]) => ({
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
      };
    }

    const children: MdxJsxFlowElement[] = [
      {
        type: 'mdxJsxFlowElement',
        name: 'TabsList',
        attributes: [],
        children: tabs.map(([name]) => ({
          type: 'mdxJsxFlowElement',
          name: 'TabsTrigger',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'value',
              value: name,
            },
          ],
          children: [mdxToAst(processor, name) as unknown as BlockContent],
        })),
      },
      ...tabs.map(
        ([name, codes]) =>
          ({
            type: 'mdxJsxFlowElement',
            name: 'TabsContent',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'value',
                value: name,
              },
            ],
            children: codes,
          }) as MdxJsxFlowElement,
      ),
    ];

    if (!withParent) return createFragment(children);

    return {
      type: 'mdxJsxFlowElement',
      name: 'Tabs',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'defaultValue',
          value: tabs[0][0],
        },
      ],
      children,
    };
  },
};

const CodeBlockTabs = {
  convert(
    processor: Processor,
    nodes: Code[],
    withMdx = false,
    withParent = true,
  ): MdxJsxFlowElement {
    const tabs = Array.from(processTabValue(nodes).entries());

    const node = generateCodeBlockTabs({
      defaultValue: tabs[0][0],
      triggers: tabs.map(([name]) => ({
        value: name,
        children: [
          withMdx
            ? (mdxToAst(processor, name) as unknown as BlockContent)
            : {
                type: 'text',
                value: name,
              },
        ],
      })),
      tabs: tabs.map(([name, codes]) => ({
        value: name,
        children: codes,
      })),
    });

    if (!withParent) return createFragment(node.children);
    return node;
  },
};

const Types = {
  CodeBlockTabs,
  Tabs,
};

export function remarkCodeTab(
  this: Processor,
  options: RemarkCodeTabOptions = {},
): Transformer<Root, Root> {
  const { parseMdx = false, Tabs = 'CodeBlockTabs' } = options;

  return (tree) => {
    const ignored = new WeakSet();

    visit(tree, (node) => {
      if (!('children' in node) || ignored.has(node)) return 'skip';
      let localTabs: TabType = Tabs;
      let localParseMdx = parseMdx;
      let withParent = true;

      if (
        node.type === 'mdxJsxFlowElement' &&
        node.name &&
        node.name in Types
      ) {
        withParent = false;
        localTabs = node.name as TabType;

        // for `Tabs` in simple mode, it doesn't support MDX tab names
        if (node.name === 'Tabs' && localParseMdx) {
          localParseMdx = node.attributes.every(
            (attribute) =>
              attribute.type !== 'mdxJsxAttribute' ||
              attribute.name !== 'items',
          );
        }
      }

      let start = -1;
      let end = 0;
      const close = () => {
        if (start === -1 || start === end) return;
        const replacement = Types[localTabs].convert(
          this,
          node.children.slice(start, end) as Code[],
          localParseMdx,
          withParent,
        );

        ignored.add(replacement);
        node.children.splice(start, end - start, replacement);
        end = start;
        start = -1;
      };

      for (; end < node.children.length; end++) {
        const child = node.children[end];
        if (child.type !== 'code' || !child.meta) {
          close();
          continue;
        }

        const meta = parseCodeBlockAttributes(child.meta, ['tab']);
        if (!meta.attributes.tab) {
          close();
          continue;
        }

        if (start === -1) start = end;
        child.meta = meta.rest;
        child.data ??= {};
        child.data.tab = meta.attributes.tab;
      }

      close();
    });
  };
}

function processTabValue(nodes: Code[]) {
  const out = new Map<string, Code[]>();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const name = node.data?.tab ?? `Tab ${i + 1}`;
    const li = out.get(name) ?? [];
    li.push(node);
    out.set(name, li);
  }
  return out;
}

/**
 * MDX tab name to tab trigger node children
 */
function mdxToAst(processor: Processor, name: string) {
  const node = processor.parse(name) as Root;

  if (node.type === 'root') {
    node.children = node.children.flatMap((child) => {
      if (child.type === 'paragraph') return child.children;

      return child;
    });
  }

  return node;
}

function createFragment(
  children: (BlockContent | DefinitionContent)[],
): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name: null,
    attributes: [],
    children,
  };
}
