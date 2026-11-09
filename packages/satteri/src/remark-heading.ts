import Slugger from 'github-slugger';
import { defineMdastPlugin, type MdastVisitorContext } from 'satteri';
import type { Heading } from 'mdast';
import { headingIdRegex } from './heading-id';
import { headingIdCode, idCodeProperty } from '../../shared/heading-id';
import { showConditions } from '../../shared/code-output';

export interface RemarkHeadingOptions {
  slug?: (heading: Heading, text: string) => string;
  customId?: boolean;
  generateToc?: boolean;
}

export function remarkHeading({
  slug,
  customId = true,
  generateToc = true,
}: RemarkHeadingOptions = {}) {
  return () => {
    let resolveSlug = slug;
    const ids = headingIdCode();
    if (!resolveSlug) {
      const slugger = new Slugger();
      resolveSlug = (_, v) => slugger.slug(v);
    }

    return defineMdastPlugin({
      name: 'remark-heading',
      before(_root, ctx) {
        if (generateToc) ctx.data.toc ??= [];
      },
      heading(node, ctx: MdastVisitorContext) {
        // visited nodes are frozen, so mutate copies
        const data = { ...node.data } as { hProperties?: Record<string, unknown> };
        const hProperties = (data.hProperties = { ...data.hProperties });

        // `setProperty` is applied after the pass, so strip the custom id
        // marker from the flattened text manually — `ctx.textContent` would
        // still see the original value.
        let title = ctx.textContent(node);
        const lastNode = node.children.at(-1);
        if (lastNode?.type === 'text' && customId) {
          const match = headingIdRegex.exec(lastNode.value);
          if (match?.[1]) {
            hProperties.id = match[1];
            const stripped = lastNode.value.slice(0, match.index!);
            title = title.slice(0, title.length - lastNode.value.length) + stripped;
            ctx.setProperty(lastNode, 'value', stripped);
          }
        }

        if (!hProperties.id) {
          hProperties.id = resolveSlug(node, title);
          const code = !slug && ids.next(node.children, showConditions(node, ctx));
          if (code) hProperties[idCodeProperty] = code;
        }

        ctx.setProperty(node, 'data', data);
        ctx.data.toc?.push({
          title,
          url: `#${hProperties.id}`,
          depth: node.depth,
        });
      },
      after(root, ctx) {
        if (ids.esm) ctx.prependChild(root, { type: 'mdxjsEsm', value: ids.esm });
      },
    });
  };
}
