import type { Processor, Transformer } from 'unified';
import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { toMarkdown } from 'mdast-util-to-markdown';
import { valueToEstree } from 'estree-util-value-to-estree';
import { removePosition } from 'unist-util-remove-position';
import remarkMdx from 'remark-mdx';
import { flattenNode } from './mdast-utils';

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
  includeProcessedMarkdown?: boolean;

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
    _format,
    includeProcessedMarkdown = false,
    includeMDAST = false,
    extractLinkReferences = false,
    valueToExport = [],
  }: PostprocessOptions,
): Transformer<Root, Root> {
  let _stringifyProcessor: Processor | undefined;
  const getStringifyProcessor = () => {
    return (_stringifyProcessor ??=
      _format === 'mdx'
        ? this
        : // force Markdown processor to stringify MDX nodes
          this().use(remarkMdx).freeze());
  };

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
      const processor = getStringifyProcessor();
      const markdown = toMarkdown(tree, {
        ...processor.data('settings'),
        // from https://github.com/remarkjs/remark/blob/main/packages/remark-stringify/lib/index.js
        extensions: processor.data('toMarkdownExtensions') || [],
      });

      file.data['mdx-export'].push({
        name: '_markdown',
        value: markdown,
      });
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
