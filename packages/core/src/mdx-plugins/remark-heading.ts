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
   * @defaultValue true
   */
  customId?: boolean;

  /**
   * Attach an array of `TOCItemType` to `file.data.toc`
   *
   * @defaultValue true
   */
  generateToc?: boolean;
}

/**
 * Add heading ids and extract TOC
 */
export function remarkHeading({
  slug: defaultSlug,
  customId = true,
  generateToc = true,
}: RemarkHeadingOptions = {}): Transformer<Root, Root> {
  return (root, file) => {
    const toc: TOCItemType[] = [];
    slugger.reset();

    visit(root, 'heading', (heading) => {
      heading.data ||= {};
      heading.data.hProperties ||= {};
      const props = heading.data.hProperties;

      const lastNode = heading.children.at(-1);
      if (lastNode?.type === 'text' && customId) {
        const match = regex.exec(lastNode.value);

        if (match?.[1]) {
          props.id = match[1];
          lastNode.value = lastNode.value.slice(0, match.index);
        }
      }

      let flattened: string | null = null;
      if (!props.id) {
        flattened ??= flattenNode(heading);

        props.id = defaultSlug
          ? defaultSlug(root, heading, flattened)
          : slugger.slug(flattened);
      }

      if (generateToc) {
        toc.push({
          title: flattened ?? flattenNode(heading),
          url: `#${props.id}`,
          depth: heading.depth,
        });
      }

      return 'skip';
    });

    if (generateToc) file.data.toc = toc;
  };
}
