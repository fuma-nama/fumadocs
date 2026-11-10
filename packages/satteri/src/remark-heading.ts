import Slugger from 'github-slugger';
import { defineMdastPlugin, type MdastVisitorContext } from 'satteri';
import type { Heading } from 'mdast';
import { headingIdCode, headingIdElement, headingIdRegex } from '../../shared/heading-id';
import { showConditions } from '../../shared/code-output';
import type { Analysis } from 'fumadocs-core/mdx-plugins/stringifier';

export interface RemarkHeadingOptions {
  slug?: (heading: Heading, text: string) => string;
  customId?: boolean;
  generateToc?: boolean;
  /** see `analysis` of `remarkHeading()` from `fumadocs-core/mdx-plugins/remark-heading` */
  analysis?: Analysis;
}

export function remarkHeading({
  slug,
  customId = true,
  generateToc = true,
  analysis,
}: RemarkHeadingOptions = {}) {
  return () => {
    let resolveSlug = slug;
    const ids = headingIdCode();
    let fromCode = false;
    if (!resolveSlug) {
      const slugger = new Slugger();
      resolveSlug = (_, v) => slugger.slug(v);
    }

    return defineMdastPlugin({
      name: 'remark-heading',
      before(_root, ctx) {
        if (generateToc) ctx.data.toc ??= [];
        fromCode = !slug && (analysis ?? ctx.data._analysis) === 'runtime';
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
          const code = fromCode && ids.next(node.children, showConditions(node, ctx));
          if (code) {
            (ctx.data._headingIds ??= {})[hProperties.id as string] = code;
            // gives the heading its ID from code
            ctx.wrapNode(node, {
              type: 'mdxJsxFlowElement',
              name: headingIdElement,
              attributes: [
                {
                  type: 'mdxJsxAttribute',
                  name: 'id',
                  value: { type: 'mdxJsxAttributeValueExpression', value: code },
                },
              ],
              children: [],
            });
          }
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
