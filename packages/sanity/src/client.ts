import type { PortableTextBlock } from 'sanity';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactNode } from 'react';

export function renderToc(opts: {
  toc: PortableTextBlock[];
  render: (body: PortableTextBlock) => ReactNode;
}): TOCItemType[] {
  const { render, toc } = opts;

  return toc.map(
    (item): TOCItemType => ({
      depth: Number(item.level ?? 0),
      title: render({ ...item, style: undefined }),
      url: `#${item._key}`,
    }),
  );
}
