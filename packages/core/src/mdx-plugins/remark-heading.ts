import Slugger from 'github-slugger';
import type { Heading, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { TOCItemType } from '@/server/get-toc';
import { flattenNode } from '@/mdx-plugins/remark-utils';

const slugger = new Slugger();

declare module 'mdast' {
  export interface HeadingData extends Data {
    hProperties?: {
      id?: string;
    };
  }
}

const regex = /\s*\[#(?<slug>[^]+?)]\s*$/;

export interface RemarkHeadingOptions {
  slug?: (root: Root, heading: Heading, text: string) => string;
  /**
   * Allow custom headings ids
   *
   * @defaultValue `true`
   */
  customId?: boolean;
}

/**
 * Add heading ids and extract TOC
 *
 * Attach an array of `TOCItemType` to `file.data.toc`
 */
export function remarkHeading({
  slug: defaultSlug,
  customId = true,
}: RemarkHeadingOptions = {}): Transformer<Root, Root> {
  return (root, file) => {
    const toc: TOCItemType[] = [];
    slugger.reset();

    visit(root, 'heading', (heading) => {
      heading.data ||= {};
      heading.data.hProperties ||= {};
      const lastNode = heading.children.at(-1);

      if (
        !heading.data.hProperties.id &&
        lastNode?.type === 'text' &&
        customId
      ) {
        const match = regex.exec(lastNode.value);

        if (match?.[1]) {
          heading.data.hProperties.id = match[1];
          lastNode.value = lastNode.value.slice(0, match.index);
        }
      }

      const value = flattenNode(heading);

      let id = heading.data.hProperties.id;
      if (!id) {
        id = defaultSlug
          ? defaultSlug(root, heading, value)
          : slugger.slug(value);
      }

      heading.data.hProperties.id = id;

      toc.push({
        title: value,
        url: `#${id}`,
        depth: heading.depth,
      });

      return 'skip';
    });

    file.data.toc = toc;
  };
}
