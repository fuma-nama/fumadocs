import type { Processor, Transformer } from 'unified';
import type { Code, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

const TabRegex = /tab="(.+?)"/;

export interface RemarkCodeTabOptions {
  /**
   * Parse MDX in tab values
   *
   * @defaultValue false
   */
  parseMdx?: boolean;
}

export function remarkCodeTab(
  this: Processor,
  options: RemarkCodeTabOptions = {},
): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, (node) => {
      if (!('children' in node)) return;
      if (node.type === 'mdxJsxFlowElement' && node.name === 'Tabs') return;
      let start = -1;
      let i = 0;

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

          node.children.splice(
            start,
            end - start,
            options.parseMdx ? toTabMdx(this, targets) : toTab(targets),
          );

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

function toTab(nodes: Code[]): MdxJsxFlowElement {
  const names = processTabValue(nodes);

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
    children: nodes.map((node, i) => {
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
    }),
  };
}

function toTabMdx(processor: Processor, nodes: Code[]): MdxJsxFlowElement {
  const names = processTabValue(nodes);
  function inline(node: Root) {
    if (node.type === 'root') {
      node.children = node.children.flatMap((child) => {
        if (child.type === 'paragraph') return child.children;

        return child;
      });
    }

    return node;
  }

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
    children: [
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
            inline(processor.parse(name) as Root) as any,
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
          }) satisfies MdxJsxFlowElement,
      ),
    ],
  };
}
