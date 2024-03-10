import Slugger from 'github-slugger';
import type { Root } from 'mdast';
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

/**
 * Add heading ids and extract TOC
 *
 * Attach an array of `TOCItemType` to `vfile.data.toc`
 */
export function remarkHeading(): Transformer<Root, Root> {
  return (node, file) => {
    const toc: TOCItemType[] = [];
    slugger.reset();

    visit(node, 'heading', (heading) => {
      heading.data ||= {};
      heading.data.hProperties ||= {};

      const text = flattenNode(heading);
      const id = slugger.slug(heading.data.hProperties.id ?? text);

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
