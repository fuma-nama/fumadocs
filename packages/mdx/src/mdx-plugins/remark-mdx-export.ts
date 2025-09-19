import type { Processor, Transformer } from 'unified';
import type { Root, RootContent } from 'mdast';
import { valueToEstree } from 'estree-util-value-to-estree';

export interface RemarkMdxExportOptions {
  /**
   * Values to export from `vfile.data`
   */
  dataNames?: string[];
}

declare module 'vfile' {
  interface DataMap {
    /**
     * [Fumadocs MDX] additional ESM exports to write
     */
    'mdx-export'?: { name: string; value: unknown }[];
  }
}

export function remarkMdxExport(
  this: Processor,
  { dataNames = [] }: RemarkMdxExportOptions = {},
): Transformer<Root, Root> {
  return (tree, file) => {
    for (const { name, value } of file.data['mdx-export'] ?? []) {
      tree.children.unshift(getMdastExport(name, value));
    }

    for (const name of dataNames) {
      if (!(name in file.data)) continue;

      tree.children.unshift(getMdastExport(name, file.data[name]));
    }
  };
}

/**
 * MDX.js first converts javascript (with esm support) into mdast nodes with remark-mdx, then handle the other remark plugins
 *
 * Therefore, if we want to inject an export, we must convert the object into AST, then add the mdast node
 */
function getMdastExport(name: string, value: unknown): RootContent {
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
            attributes: [],
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
