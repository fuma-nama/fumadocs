import type { Processor, Transformer } from 'unified';
import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { toMarkdown } from 'mdast-util-to-markdown';
import { valueToEstree } from 'estree-util-value-to-estree';
import { removePosition } from 'unist-util-remove-position';

export interface ExtractedReference {
  href: string;
}

export interface PostprocessOptions {
  /**
   * Properties to export from `vfile.data`
   */
  valueToExport?: string[];

  /**
   * stringify MDAST and export via `_markdown`.
   */
  includeProcessedMarkdown?: boolean;

  /**
   * store MDAST and export via `_mdast`.
   */
  includeMDAST?:
    | boolean
    | {
        removePosition?: boolean;
      };
}

/**
 * - collect references
 * - write frontmatter (auto-title & description)
 */
export function remarkPostprocess(
  this: Processor,
  {
    includeProcessedMarkdown = false,
    includeMDAST = false,
    valueToExport = [],
  }: PostprocessOptions = {},
): Transformer<Root, Root> {
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

    if (includeProcessedMarkdown) {
      file.data._markdown = toMarkdown(tree, {
        ...this.data('settings'),
        // from https://github.com/remarkjs/remark/blob/main/packages/remark-stringify/lib/index.js
        extensions: this.data('toMarkdownExtensions') || [],
      });
    }

    if (includeMDAST) {
      const options = includeMDAST === true ? {} : includeMDAST;

      file.data._mdast = JSON.stringify(
        options.removePosition ? removePosition(structuredClone(tree)) : tree,
      );
    }

    for (const { name, value } of file.data['mdx-export'] ?? []) {
      tree.children.unshift(getMdastExport(name, value));
    }

    for (const name of valueToExport) {
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

function flattenNode(node: RootContent): string {
  if ('children' in node)
    return node.children.map((child) => flattenNode(child)).join('');

  if ('value' in node) return node.value;

  return '';
}
