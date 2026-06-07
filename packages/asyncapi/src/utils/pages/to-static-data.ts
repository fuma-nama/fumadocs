import type { AsyncAPIObject } from '@/types';
import Slugger from 'github-slugger';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { GeneratedPageProps } from './builder';
import { resolveOperation } from '@/utils/operation';

export function toStaticData(
  page: GeneratedPageProps,
  doc: AsyncAPIObject,
): {
  toc: TOCItemType[];
  structuredData: StructuredData;
} {
  const slugger = new Slugger();
  const toc: TOCItemType[] = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  for (const item of page.operations ?? []) {
    const resolved = resolveOperation(item.id, doc);
    if (!resolved) continue;

    if (page.showTitle) {
      const title = resolved.operation.title || resolved.operation.summary || item.id;
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

    if (resolved.operation.description) {
      structuredData.contents.push({
        content: resolved.operation.description,
        heading: structuredData.headings.at(-1)?.id,
      });
    }
  }

  return { toc, structuredData };
}
