import type { Processor, Transformer } from 'unified';
import type { Code, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

const TabRegex = /tab="(.+?)"/;

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

const Tabs = {
  convert(
    processor: Processor,
    nodes: Code[],
    withMdx = false,
    withParent = true,
  ): MdxJsxFlowElement {
    const names = processTabValue(nodes);

    if (!withMdx) {
      const children: MdxJsxFlowElement[] = nodes.map((node, i) => {
        return {
          type: 'mdxJsxFlowElement',
          name: 'Tab',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'value',
              value: names[i],
            },
          ],
          children: [node],
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
              value: names.join(', '),
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
                        elements: names.map((name) => ({
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
        children: names.map((name) => ({
          type: 'mdxJsxFlowElement',
          name: 'TabsTrigger',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'value',
              value: name,
            },
          ],
          children: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- needed
            mdxToAst(processor, name) as any,
          ],
        })),
      },
      ...nodes.map(
        (node, i) =>
          ({
            type: 'mdxJsxFlowElement',
            name: 'TabsContent',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'value',
                value: names[i],
              },
            ],
            children: [node],
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
          value: names[0],
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
    const names = processTabValue(nodes);
    const children: MdxJsxFlowElement[] = [
      {
        type: 'mdxJsxFlowElement',
        name: 'CodeBlockTabsList',
        attributes: [],
        children: names.map((name) => {
          return {
            type: 'mdxJsxFlowElement',
            name: 'CodeBlockTabsTrigger',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'value',
                value: name,
              },
            ],
            children: [
              withMdx
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any -- needed
                  (mdxToAst(processor, name) as any)
                : {
                    type: 'text',
                    value: name,
                  },
            ],
          };
        }),
      },
      ...nodes.map((node, i) => {
        return {
          type: 'mdxJsxFlowElement',
          name: 'CodeBlockTab',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'value',
              value: names[i],
            },
          ],
          children: [node],
        } as MdxJsxFlowElement;
      }),
    ];

    if (!withParent) return createFragment(children);

    return {
      type: 'mdxJsxFlowElement',
      name: 'CodeBlockTabs',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'defaultValue',
          value: names[0],
        },
      ],
      children,
    };
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
    visit(tree, (node) => {
      if (!('children' in node)) return;
      let start = -1;
      let i = 0;
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
        if (node.name === 'Tabs') {
          localParseMdx = node.attributes.every(
            (attribute) =>
              attribute.type !== 'mdxJsxAttribute' ||
              attribute.name !== 'items',
          );
        }
      }

      while (i < node.children.length) {
        const child = node.children[i];
        const isSwitcher =
          child.type === 'code' && child.meta && child.meta.match(TabRegex);

        if (isSwitcher && start === -1) {
          start = i;
        }

        // if switcher code blocks terminated, convert them to tabs
        const isLast = i === node.children.length - 1;
        if (start !== -1 && (isLast || !isSwitcher)) {
          const end = isSwitcher ? i + 1 : i;
          const targets = node.children.slice(start, end) as Code[];
          const replacement = Types[localTabs].convert(
            this,
            targets,
            localParseMdx,
            withParent,
          );

          node.children.splice(start, end - start, replacement);
          if (isLast) break;
          i = start + 1;
          start = -1;
        } else {
          i++;
        }
      }
    });
  };
}

function processTabValue(nodes: Code[]) {
  return nodes.map((node, i) => {
    let title = `Tab ${i + 1}`;

    node.meta = node.meta?.replace(TabRegex, (_, value) => {
      title = value;
      return '';
    });

    return title;
  });
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

function createFragment(children: MdxJsxFlowElement[]): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name: null,
    attributes: [],
    children,
  };
}
