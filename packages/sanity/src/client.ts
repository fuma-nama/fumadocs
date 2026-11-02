import type { PortableTextBlock } from '@portabletext/react';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactNode } from 'react';

export function renderToc(opts: {
  toc: PortableTextBlock[];
  render: (body: PortableTextBlock) => ReactNode;
}): TOCItemType[] {
  const { render, toc } = opts;

  return toc.map((item): TOCItemType => ({
    // `level` is the depth of list items, headings have their level in `style`
    depth: Number(item.style?.slice(1)) || 1,
    title: render({ ...item, style: undefined }),
    url: `#${item._key}`,
  }));
}
