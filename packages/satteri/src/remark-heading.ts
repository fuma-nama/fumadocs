import Slugger from 'github-slugger';
import { defineMdastPlugin, type MdastVisitorContext } from 'satteri';
import type { Heading } from 'mdast';

const regex = /\s*\[#(?<slug>[^]+?)]\s*$/;

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
    const slugger = slug ? undefined : new Slugger();
    const resolveSlug = slug ?? ((_heading, text) => slugger!.slug(text));

    let sluggerReady = false;

    return defineMdastPlugin({
      name: 'remark-heading',
      heading(node, ctx: MdastVisitorContext) {
        if (!sluggerReady) {
          slugger?.reset();
          sluggerReady = true;
        }

        const data = (node.data ?? {}) as { hProperties?: Record<string, unknown> };
        const hProperties = (data.hProperties ??= {});

        const lastNode = node.children.at(-1);
        if (lastNode?.type === 'text' && customId) {
          const match = regex.exec(lastNode.value);
          if (match?.[1]) {
            hProperties.id = match[1];
            ctx.setProperty(lastNode, 'value', lastNode.value.slice(0, match.index!));
          }
        }

        let title: string | null = null;
        if (!hProperties.id) {
          title = ctx.textContent(node);
          hProperties.id = resolveSlug(node, title);
        }

        ctx.setProperty(node, 'data', data as typeof node.data);

        if (generateToc) {
          const toc = (ctx.data.toc ??= []);
          toc.push({
            title: title ?? ctx.textContent(node),
            url: `#${hProperties.id}`,
            depth: node.depth,
          });
        }
      },
    });
  };
}
