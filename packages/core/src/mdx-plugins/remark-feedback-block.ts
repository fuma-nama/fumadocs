import type { Transformer } from 'unified';
import type { BlockContent, Root, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { visit } from 'unist-util-visit';
import { createHash } from 'node:crypto';
import { flattenNode } from './mdast-utils';

export interface RemarkFeedbackBlockOptions {
  /**
   * generate block ID, default to using MD5.
   */
  generateHash?: (ctx: { body: string }) => string;

  /**
   * @defaultValue FeedbackBlock
   */
  tagName?: string;

  /**
   * determine how the node should be resolved into a feedback block.
   *
   * scan paragraph, list, and image nodes by default.
   *
   * @returns
   * - `true`: convert the node into a feedback block.
   * - `false`: skip the current node and look into its children.
   * - `skip`: skip the current node and its children.
   */
  resolve?: (node: RootContent) => boolean | 'skip';

  /**
   * generate & include the block body to `<FeedbackBlock body="..." />` as string
   *
   * @defaultValue true
   */
  generateBody?: boolean;
}

export interface FeedbackBlockProps {
  id: string;
  /** the text body of block, only exists when `generateBody` is enabled. */
  body?: string;
}

/**
 * Generate MDX `<FeedbackBlock />` elements with an unique `id` for every block-like element.
 *
 * Note: the uniqueness is only guaranteed per MDX file/page.
 */
export function remarkFeedbackBlock({
  generateHash = ({ body }) => createHash('md5').update(body).digest('hex').substring(0, 16),
  tagName = 'FeedbackBlock',
  resolve = (node) => node.type === 'paragraph' || node.type === 'image' || node.type === 'list',
  generateBody = true,
}: RemarkFeedbackBlockOptions = {}): Transformer<Root, Root> {
  return (tree) => {
    const counts = new Map<string, number>();

    visit(tree, (node, index, parent) => {
      if (node.type === 'root') return;
      const resolved = resolve(node);
      if (resolved === false) return;
      if (resolved === 'skip') return 'skip';

      const text = flattenNode(node).trim();
      if (text.length === 0 || !parent || typeof index !== 'number') return;
      let id = generateHash({ body: text });
      const count = counts.get(id) ?? 0;
      if (count > 0) id = `${id}-${count}`;
      counts.set(id, count + 1);

      const wrapper: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: tagName,
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'id',
            value: id,
          },
        ],
        children: [node as BlockContent],
      };
      if (generateBody)
        wrapper.attributes.push({
          type: 'mdxJsxAttribute',
          name: 'body',
          value: text,
        });

      parent.children[index] = wrapper;
      return 'skip';
    });
  };
}
