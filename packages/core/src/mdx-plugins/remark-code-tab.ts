import type { Transformer } from 'unified';
import type { Code, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';

const TabRegex = /tab="(.+?)"/;

function toTab(nodes: Code[]) {
  const names = nodes.map((node, i) => {
    let title = `Tab ${i + 1}`;

    node.meta = node.meta?.replace(TabRegex, (_, value) => {
      title = value;
      return '';
    });

    return title;
  });

  const itemsArr = {
    type: 'ExpressionStatement',
    expression: {
      type: 'ArrayExpression',
      elements: names.map((name) => ({
        type: 'Literal',
        value: name,
      })),
    },
  };

  return {
    type: 'mdxJsxFlowElement',
    name: 'Tabs',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'items',
        value: {
          type: 'mdxJsxAttributeValueExpression',
          data: {
            estree: {
              type: 'Program',
              sourceType: 'module',
              comments: [],
              body: [itemsArr],
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

export function remarkCodeTab(): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type === 'mdxJsxFlowElement' && node.name === 'Tabs') return;
      if ('children' in node) {
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
            const targets = node.children.slice(start, end);

            node.children.splice(
              start,
              end - start,
              toTab(targets as Code[]) as RootContent,
            );

            if (isLast) break;
            i = start;
            start = -1;
          }

          i++;
        }
      }
    });
  };
}
