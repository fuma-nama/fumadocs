import Slugger from 'github-slugger';
import {
  defineMdastPlugin,
  type HastPluginInput,
  type MdastVisitorContext,
  type MdxJsxAttributeNode,
  type MdxJsxFlowElementHast,
} from 'satteri';
import type { Heading } from 'mdast';
import { headingIdCode, headingIdRegex } from '../../shared/heading-id';
import { showConditions } from '../../shared/show';

export interface RemarkHeadingOptions {
  slug?: (heading: Heading, text: string) => string;
  /** see `slugImportSource` of `remarkHeading()` from `fumadocs-core/mdx-plugins/remark-heading` */
  slugImportSource?: string;
  customId?: boolean;
  generateToc?: boolean;
}

export function remarkHeading({
  slug,
  slugImportSource,
  customId = true,
  generateToc = true,
}: RemarkHeadingOptions = {}) {
  return () => {
    let resolveSlug = slug;
    const ids = headingIdCode(slugImportSource);
    let fromCode = false;
    if (!resolveSlug) {
      const slugger = new Slugger();
      resolveSlug = (_, v) => slugger.slug(v);
    }

    return defineMdastPlugin({
      name: 'remark-heading',
      before(_root, ctx) {
        if (generateToc) ctx.data.toc ??= [];
        // a custom slug needs its own runtime to slug when rendering
        fromCode =
          (!slug || slugImportSource !== undefined) && ctx.data.unstable_runtimeOutputs === true;
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
          if (code) (ctx.data._headingIds ??= {})[hProperties.id as string] = code;
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

/** Sätteri port of `rehypeHeading()` from `fumadocs-core/mdx-plugins/remark-heading` */
export function rehypeHeading(): HastPluginInput {
  return () => ({
    name: 'rehype-heading',
    element: {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      visit(node, ctx) {
        const code = ctx.data._headingIds?.[node.properties.id as string];
        if (!code) return;

        // Sätteri maps JSX of Markdown elements to MDX components
        const attributes: MdxJsxAttributeNode[] = [];
        for (const name in node.properties) {
          const value = node.properties[name];
          if (value == null) continue;
          attributes.push({
            type: 'mdxJsxAttribute',
            name,
            value: {
              type: 'mdxJsxAttributeValueExpression',
              // space-separated, like `className`
              value:
                name === 'id'
                  ? code
                  : JSON.stringify(Array.isArray(value) ? value.join(' ') : value),
            },
          });
        }
        ctx.replaceNode(node, {
          type: 'mdxJsxFlowElement',
          name: node.tagName,
          attributes,
          children: node.children,
        } as MdxJsxFlowElementHast);
      },
    },
  });
}
