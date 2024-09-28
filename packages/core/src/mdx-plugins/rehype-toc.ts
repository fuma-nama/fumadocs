import type { Processor, Transformer } from 'unified';
import type { Root } from 'hast';
import { toEstree } from 'hast-util-to-estree';
import type { Declaration, JSXElement } from 'estree-jsx';
import { visit } from '@/mdx-plugins/hast-utils';

export interface RehypeTocOptions {
  /**
   * Export generated toc as a variable
   *
   * @defaultValue true
   */
  exportToc?: boolean;
}

export function rehypeToc(
  this: Processor,
  { exportToc = true }: RehypeTocOptions = {},
): Transformer<Root, Root> {
  return (tree) => {
    const output: {
      title: JSXElement;
      url: string;
      depth: number;
    }[] = [];

    visit(tree, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], (element) => {
      const id = element.properties.id as string | undefined;
      if (!id) return 'skip';

      const estree = toEstree(element, {
        elementAttributeNameCase: 'react',
        stylePropertyNameCase: 'dom',
      });

      if (estree.body[0].type === 'ExpressionStatement')
        output.push({
          title: estree.body[0].expression as unknown as JSXElement,
          depth: Number(element.tagName.slice(1)),
          url: `#${id}`,
        });

      return 'skip';
    });

    const declaration: Declaration = {
      type: 'VariableDeclaration',
      kind: 'const',
      declarations: [
        {
          type: 'VariableDeclarator',
          id: {
            type: 'Identifier',
            name: 'toc',
          },
          init: {
            type: 'ArrayExpression',
            elements: output.map((item) => ({
              type: 'ObjectExpression',
              properties: [
                {
                  type: 'Property',
                  method: false,
                  shorthand: false,
                  computed: false,
                  key: {
                    type: 'Identifier',
                    name: 'depth',
                  },
                  value: {
                    type: 'Literal',
                    value: item.depth,
                  },
                  kind: 'init',
                },
                {
                  type: 'Property',
                  method: false,
                  shorthand: false,
                  computed: false,
                  key: {
                    type: 'Identifier',
                    name: 'url',
                  },
                  value: {
                    type: 'Literal',
                    value: item.url,
                  },
                  kind: 'init',
                },
                {
                  type: 'Property',
                  method: false,
                  shorthand: false,
                  computed: false,
                  key: {
                    type: 'Identifier',
                    name: 'title',
                  },
                  value: {
                    type: 'JSXFragment',
                    openingFragment: { type: 'JSXOpeningFragment' },
                    closingFragment: { type: 'JSXClosingFragment' },
                    children: item.title.children,
                  },
                  kind: 'init',
                },
              ],
            })),
          },
        },
      ],
    };

    tree.children.push({
      type: 'mdxjsEsm',
      value: '',
      data: {
        estree: {
          type: 'Program',
          body: [
            exportToc
              ? {
                  type: 'ExportNamedDeclaration',
                  declaration,
                  specifiers: [],
                }
              : declaration,
          ],
          sourceType: 'module',
          comments: [],
        },
      },
    });
  };
}