import Slugger from 'github-slugger';
import type { Heading, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { TOCItemType } from '@/server/get-toc';

const slugger = new Slugger();

declare module 'mdast' {
  export interface HeadingData extends Data {
    hProperties?: {
      id?: string;
    };
  }
}

const regex = /\s*\[#(?<slug>[^]+?)]\s*$/g;

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
      const node = heading.children.at(-1);
      if (!node || node.type !== 'text') return;

      heading.data ||= {};
      heading.data.hProperties ||= {};

      let id = heading.data.hProperties.id;

      if (!id && customId) {
        const match = regex.exec(node.value);

        if (match?.[1]) {
          id = match[1];
          node.value = node.value.slice(0, match.index);
        }
      }

      if (!id) {
        id = defaultSlug
          ? defaultSlug(root, heading, node.value)
          : slugger.slug(node.value);
      }

      heading.data.hProperties.id = id;

      toc.push({
        title: node.value,
        url: `#${id}`,
        depth: heading.depth,
      });

      return 'skip';
    });

    file.data.toc = toc;
  };
}
