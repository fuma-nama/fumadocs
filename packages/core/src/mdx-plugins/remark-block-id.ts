import type { Transformer } from 'unified';
import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { flattenNode } from './utils';
import Slugger from 'github-slugger';
import { createHash } from 'node:crypto';

export interface RemarkBlockIdOptions {
  /**
   * generate block ID.
   */
  generateId?: (ctx: { node: RootContent; text: string }) => string;

  /**
   * determine whether an ID should be generated for a given node.
   *
   * default: `true` for block nodes, otherwise `false`.
   *
   * @returns
   * - `true`: generate an ID for the node.
   * - `false`: skip the current node and look into its children.
   * - `skip`: skip the current node and its children.
   */
  shouldGenerate?: (node: RootContent) => boolean | 'skip';

  /**
   * Add `data-block="<value>"` to updated nodes, pass `null` to disable.
   *
   * @default "default"
   */
  addDataAttribute?: string | null;
}

/**
 * Generate ID for each block node in Markdown/MDX.
 *
 * Note: the uniqueness is only guaranteed per file.
 */
export function remarkBlockId({
  generateId,
  addDataAttribute = 'default',
  shouldGenerate = (node) => {
    switch (node.type) {
      case 'mdxJsxFlowElement':
        return 'skip';
      case 'paragraph':
      case 'image':
      case 'listItem':
        return true;
      default:
        return false;
    }
  },
}: RemarkBlockIdOptions = {}): Transformer<Root, Root> {
  return (tree) => {
    const slugger = new Slugger();

    visit(tree, (node) => {
      if (node.type === 'root' || node.data?.hProperties?.id) return;

      const resolved = shouldGenerate(node);
      if (resolved === false) return;
      if (resolved === 'skip') return 'skip';

      const text = flattenNode(node).trim();
      if (text.length === 0) return;

      const id = generateId
        ? slugger.slug(generateId({ node, text }))
        : slugger.slug(createHash('sha256').update(text).digest('base64url'));

      node.data ??= {};
      node.data.hProperties ??= {};
      node.data.hProperties.id = id;
      if (addDataAttribute) {
        node.data.hProperties['data-block'] = addDataAttribute;
      }
    });
  };
}
