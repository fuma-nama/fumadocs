import type { Processor, Transformer } from 'unified';
import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { toMarkdown } from 'mdast-util-to-markdown';

declare module 'vfile' {
  interface DataMap {
    extractedReferences: ExtractedReference[];

    /**
     * [Fumadocs MDX] Processed Markdown content before `remark-rehype`.
     */
    _markdown?: string;
  }
}

export interface ExtractedReference {
  href: string;
}

export interface PostprocessOptions {
  /**
   * stringify MDAST and export via `_markdown`.
   */
  includeProcessedMarkdown?: boolean;
}

/**
 * - collect references
 * - write frontmatter (auto-title & description)
 */
export function remarkPostprocess(
  this: Processor,
  { includeProcessedMarkdown = false }: PostprocessOptions = {},
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
        // @ts-expect-error - from https://github.com/remarkjs/remark/blob/main/packages/remark-stringify/lib/index.js
        extensions: this.data('toMarkdownExtensions') || [],
      });
    }
  };
}

function flattenNode(node: RootContent): string {
  if ('children' in node)
    return node.children.map((child) => flattenNode(child)).join('');

  if ('value' in node) return node.value;

  return '';
}
