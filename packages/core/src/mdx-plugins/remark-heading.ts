import Slugger from 'github-slugger';
import type { Heading, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import type { TOCItemType } from '@/server/get-toc';
import { flattenNode } from './remark-utils';

const slugger = new Slugger();

declare module 'mdast' {
  export interface HeadingData extends Data {
    hProperties?: {
      id?: string;
    };
  }
}

export interface RemarkHeadingOptions {
  slug?: (root: Root, heading: Heading, text: string) => string;
}

/**
 * Add heading ids and extract TOC
 *
 * Attach an array of `TOCItemType` to `file.data.toc`
 */
export function remarkHeading(
  options: RemarkHeadingOptions = {},
): Transformer<Root, Root> {
  return (node, file) => {
    const toc: TOCItemType[] = [];
    slugger.reset();

    visit(node, 'heading', (heading) => {
      heading.data ||= {};
      heading.data.hProperties ||= {};

      const text = flattenNode(heading);
      const id =
        heading.data.hProperties.id ??
        (options.slug ? options.slug(node, heading, text) : defaultSlug(text));

      heading.data.hProperties.id = id;

      toc.push({
        title: text,
        url: `#${id}`,
        depth: heading.depth,
      });

      return 'skip';
    });

    file.data.toc = toc;
  };
}

function defaultSlug(text: string): string {
  // match {slug}, while escape `\{slug}`
  if (text.endsWith('}')) {
    const start = text.lastIndexOf('{');

    if (start !== -1 && text[start - 1] !== '\\')
      return text.substring(start + 1, text.length - 1);
  }

  return slugger.slug(text);
}
