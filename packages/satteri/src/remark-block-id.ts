import { defineMdastPlugin } from 'satteri';
import Slugger from 'github-slugger';
import { createHash } from 'node:crypto';
import type { MdastNode, MdastVisitorContext } from 'satteri';

export interface RemarkBlockIdOptions {
  generateId?: (ctx: { node: MdastNode; text: string }) => string;
  shouldGenerate?: (node: MdastNode) => boolean | 'skip';
  addDataAttribute?: string | null;
}

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
}: RemarkBlockIdOptions = {}) {
  return () => {
    const slugger = new Slugger();

    function visit(node: MdastNode, ctx: MdastVisitorContext) {
      const existing = node.data as { hProperties?: Record<string, unknown> } | undefined;
      if (existing?.hProperties?.id) return;

      const resolved = shouldGenerate(node);
      if (resolved === false || resolved === 'skip') return;

      // matches `flattenNode` semantics but walks the subtree in Rust
      const text = ctx.textContent(node, { includeImageAlt: false }).trim();
      if (text.length === 0) return;

      const id = generateId
        ? slugger.slug(generateId({ node, text }))
        : slugger.slug(createHash('sha256').update(text).digest('base64url'));

      // visited nodes are frozen, so mutate copies
      const hProperties: Record<string, unknown> = { ...existing?.hProperties, id };
      if (addDataAttribute) {
        hProperties['data-block'] = addDataAttribute;
      }
      ctx.setProperty(node, 'data', { ...existing, hProperties });
    }

    return defineMdastPlugin({
      name: 'remark-block-id',
      paragraph: visit,
      image: visit,
      listItem: visit,
    });
  };
}
