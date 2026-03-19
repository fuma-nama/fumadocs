import type { Processor, Transformer } from 'unified';
import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { valueToEstree } from 'estree-util-value-to-estree';
import { removePosition } from 'unist-util-remove-position';
import { flattenNode } from './mdast-utils';
import type { LLMsOptions } from 'fumadocs-core/mdx-plugins';
import { remarkLLMs } from 'fumadocs-core/mdx-plugins/remark-llms';

export interface ExtractedReference {
  href: string;
}

export interface PostprocessOptions {
  _format: 'md' | 'mdx';

  /**
   * Properties to export from `vfile.data`
   */
  valueToExport?: string[];

  /**
   * stringify MDAST and export via `_markdown`.
   */
  includeProcessedMarkdown?: boolean | LLMsOptions;

  /**
   * extract link references, export via `extractedReferences`.
   */
  extractLinkReferences?: boolean;

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
    extractLinkReferences = false,
    valueToExport = [],
  }: PostprocessOptions,
): Transformer<Root, Root> {
  return (tree, file) => {
    const frontmatter = (file.data.frontmatter ??= {});
    if (!frontmatter.title) {
      visit(tree, 'heading', (node) => {
        if (node.depth === 1) {
          frontmatter.title = flattenNode(node);
          return false;
        }
      });
    }

    file.data['mdx-export'] ??= [];
    file.data['mdx-export'].push({
      name: 'frontmatter',
      value: frontmatter,
    });

    if (extractLinkReferences) {
      const urls: ExtractedReference[] = [];

      visit(tree, 'link', (node) => {
        urls.push({
          href: node.url,
        });
        return 'skip';
      });

      file.data['mdx-export'].push({
        name: 'extractedReferences',
        value: urls,
      });
    }

    if (includeProcessedMarkdown) {
      const llms = remarkLLMs.call(
        this,
        typeof includeProcessedMarkdown === 'object' ? includeProcessedMarkdown : undefined,
      );
      llms(tree, file, () => undefined);
    }

    if (includeMDAST) {
      const options = includeMDAST === true ? {} : includeMDAST;
      const mdast = JSON.stringify(
        options.removePosition ? removePosition(structuredClone(tree)) : tree,
      );

      file.data['mdx-export'].push({
        name: '_mdast',
        value: mdast,
      });
    }

    for (const { name, value } of file.data['mdx-export']) {
      tree.children.unshift(getMdastExport(name, value));
    }

    // reset the data to reduce memory usage
    file.data['mdx-export'] = [];

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
