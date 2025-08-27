import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import { valueToEstree } from 'estree-util-value-to-estree';

interface Options {
  /**
   * Values to export from `vfile.data`
   */
  values: string[];
}

/**
 * Export properties from `vfile.data`
 */
function remarkMdxExport({ values }: Options): Transformer<Root, Root> {
  return (tree, vfile) => {
    for (const name of values) {
      if (!(name in vfile.data)) continue;

      // @ts-expect-error -- It is a node
      tree.children.unshift(getMdastExport(name, vfile.data[name]));
    }
  };
}

export { remarkMdxExport as default, type Options };

/**
 * MDX.js first converts javascript (with esm support) into mdast nodes with remark-mdx, then handle the other remark plugins
 *
 * Therefore, if we want to inject an export, we must convert the object into AST, then add the mdast node
 */
export function getMdastExport(name: string, value: unknown): object {
  return {
    type: 'mdxjsEsm',
    value: '',
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ExportNamedDeclaration',
            specifiers: [],
            source: null,
            declaration: {
              type: 'VariableDeclaration',
              kind: 'let',
              declarations: [
                {
                  type: 'VariableDeclarator',
                  id: {
                    type: 'Identifier',
                    name,
                  },
                  init: valueToEstree(value),
                },
              ],
            },
          },
        ],
      },
    },
  };
}
