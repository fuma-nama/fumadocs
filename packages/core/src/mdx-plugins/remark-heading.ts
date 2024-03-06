import Slugger from 'github-slugger';
import type { Heading, Root } from 'mdast';
import type { Transformer } from 'unified';
import type { TOCItemType } from '@/server/get-toc';
import { visit } from './unist-visit';
import { flattenNode } from './remark-utils';

const slugger = new Slugger();

export interface HProperties {
  id?: string;
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

    visit(node, ['heading'], (heading: Heading) => {
      heading.data ||= {};
      heading.data.hProperties ||= {};

      const text = flattenNode(heading);
      const properties = heading.data.hProperties;
      const id = slugger.slug(properties.id ?? text);

      properties.id = id;

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
