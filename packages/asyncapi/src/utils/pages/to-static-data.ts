import type { AsyncAPIObject } from '@/types';
import Slugger from 'github-slugger';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { GeneratedPageProps } from './builder';
import { dereferenceShallow } from '@fumadocs/api-docs/schema/dereference';
import { createMagicProxy } from '@scalar/json-magic/magic-proxy';
import { getOperationDisplayName } from '../schema';

export function toStaticData(
  page: GeneratedPageProps,
  doc: AsyncAPIObject,
): {
  toc: TOCItemType[];
  structuredData: StructuredData;
} {
  // wrap in a magic proxy so that `dereferenceShallow` can resolve refs lazily
  const proxied = createMagicProxy(doc as never) as AsyncAPIObject;
  const slugger = new Slugger();
  const toc: TOCItemType[] = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  for (const item of page.operations ?? []) {
    const operation = dereferenceShallow(proxied.operations?.[item.id]);
    if (!operation) continue;

    if (page.showTitle) {
      const title = getOperationDisplayName(item.id, operation);
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

    if (operation.description) {
      structuredData.contents.push({
        content: operation.description,
        heading: structuredData.headings.at(-1)?.id,
      });
    }
  }

  return { toc, structuredData };
}
