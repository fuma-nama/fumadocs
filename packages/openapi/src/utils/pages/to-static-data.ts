import type { NoReference } from '@/utils/schema';
import type { Document, OperationObject } from '@/types';
import Slugger from 'github-slugger';
import { idToTitle } from '@/utils/id-to-title';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { ApiPageProps } from '@/ui';

export function toStaticData(
  page: ApiPageProps,
  dereferenced: NoReference<Document>,
): {
  toc: TOCItemType[];
  structuredData: StructuredData;
} {
  const slugger = new Slugger();
  const toc: TOCItemType[] = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  function pathItem(item: NoReference<OperationObject>, defaultTitle: string) {
    if (page.showTitle && item.operationId) {
      const title = item.summary || (item.operationId ? idToTitle(item.operationId) : defaultTitle);
      const id = slugger.slug(title);

      toc.push({
        depth: 2,
        title,
        url: `#${id}`,
      });
      structuredData.headings.push({
        content: title,
        id,
      });
    }

    if (item.description)
      structuredData.contents.push({
        content: item.description,
        heading: structuredData.headings.at(-1)?.id,
      });
  }

  for (const item of page.operations ?? []) {
    const operation = dereferenced.paths?.[item.path]?.[item.method];
    if (!operation) continue;

    pathItem(operation, item.path);
  }

  for (const item of page.webhooks ?? []) {
    const webhook = dereferenced.webhooks?.[item.name]?.[item.method];
    if (!webhook) continue;

    pathItem(webhook, item.name);
  }

  return { toc, structuredData };
}
