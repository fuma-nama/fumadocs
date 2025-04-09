import type { HTMLAttributes } from 'react';
import type { LoaderConfig, LoaderOutput, Page } from 'fumadocs-core/source';
import { getPageTreePeers, type PageTree } from 'fumadocs-core/server';
import { Card, Cards } from '@/components/card';

/**
 * @deprecated use https://fumadocs.vercel.app/docs/ui/markdown#further-reading-section instead
 */
export function DocsCategory({
  page,
  from,
  tree: forcedTree,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  page: Page;
  from: LoaderOutput<LoaderConfig>;
  tree?: PageTree.Root;
}) {
  let tree;

  if (forcedTree) {
    tree = forcedTree;
  } else if (from._i18n) {
    const locale = page.locale ?? from._i18n.defaultLanguage;

    tree = (from as LoaderOutput<LoaderConfig & { i18n: true }>).pageTree[
      locale
    ];
  } else {
    tree = from.pageTree;
  }

  let items = getPageTreePeers(tree, page.url);
  if (items.length === 0) {
    const pages = from.getPages(page.locale);

    items = pages
      .filter(
        (item) =>
          item.file.dirname === page.file.dirname &&
          item.file.path !== page.file.path,
      )
      .map((page) => ({
        type: 'page',
        name: page.data.title,
        description: page.data.description,
        url: page.url,
      }));
  }

  if (items.length === 0) return null;

  return (
    <Cards {...props}>
      {items.map((item) => (
        <Card
          key={item.url}
          title={item.name}
          description={item.description}
          href={item.url}
        />
      ))}
    </Cards>
  );
}

export * from './page';
