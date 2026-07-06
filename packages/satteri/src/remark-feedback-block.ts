import { defineMdastPlugin } from 'satteri';
import type { MdastNode, MdastVisitorContext } from 'satteri';
import { createHash } from 'node:crypto';

export interface RemarkFeedbackBlockOptions {
  generateHash?: (ctx: { body: string }) => string;
  tagName?: string;
  resolve?: (node: MdastNode) => boolean | 'skip';
  generateBody?: boolean;
}

// TODO: allow to define visitors from options
export function remarkFeedbackBlock({
  generateHash = ({ body }) => createHash('md5').update(body).digest('hex').substring(0, 16),
  tagName = 'FeedbackBlock',
  resolve = (node) => {
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
  generateBody = true,
}: RemarkFeedbackBlockOptions = {}) {
  return () => {
    const counts = new Map<string, number>();

    function visit(node: MdastNode, ctx: MdastVisitorContext) {
      const resolved = resolve(node);
      if (resolved === false || resolved === 'skip') return;

      const text = ctx.textContent(node, { includeImageAlt: false }).trim();
      if (text.length === 0) return;

      let id = generateHash({ body: text });
      const count = counts.get(id) ?? 0;
      if (count > 0) id = `${id}-${count}`;
      counts.set(id, count + 1);

      const attributes = [{ type: 'mdxJsxAttribute' as const, name: 'id', value: id }];
      if (generateBody) {
        attributes.push({ type: 'mdxJsxAttribute', name: 'body', value: text });
      }

      // `wrapNode` records a per-node patch; rewriting the parent's children
      // would clobber the patches of sibling blocks visited earlier
      ctx.wrapNode(node, {
        type: 'mdxJsxFlowElement',
        name: tagName,
        attributes,
        data: { _stringify: 'children-only' },
        children: [],
      });
    }

    return defineMdastPlugin({
      name: 'remark-feedback-block',
      paragraph: visit,
      image: visit,
      listItem: visit,
    });
  };
}
