import type { Transformer } from 'unified';
import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { valueToEstree } from 'estree-util-value-to-estree';

declare module 'vfile' {
  interface DataMap {
    extractedReferences: ExtractedReference[];
  }
}

export interface ExtractedReference {
  href: string;
}

export interface PostprocessOptions {
  /**
   * Values to export from `vfile.data`
   */
  injectExports: string[];
}

/**
 * - write exports
 * - collect references
 * - write frontmatter (auto-title & description)
 */
export function remarkPostprocess({
  injectExports,
}: PostprocessOptions): Transformer<Root, Root> {
  return (tree, file) => {
    let title: string | undefined;
    const urls: ExtractedReference[] = [];

    visit(tree, ['heading', 'link'], (node) => {
      if (node.type === 'heading' && node.depth === 1) {
        title = flattenNode(node);
      }

      if (node.type !== 'link') return;

      urls.push({
        href: node.url,
      });

      return 'skip';
    });

    if (title) {
      file.data.frontmatter ??= {};

      if (!file.data.frontmatter.title) file.data.frontmatter.title = title;
    }

    file.data.extractedReferences = urls;

    for (const name of injectExports) {
      if (!(name in file.data)) continue;

      tree.children.unshift(getMdastExport(name, file.data[name]));
    }
  };
}

function flattenNode(node: RootContent): string {
  if ('children' in node)
    return node.children.map((child) => flattenNode(child)).join('');

  if ('value' in node) return node.value;

  return '';
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
