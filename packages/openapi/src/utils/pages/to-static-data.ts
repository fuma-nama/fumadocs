import type { Document, OperationObject } from '@/types';
import Slugger from 'github-slugger';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { GeneratedPageProps } from './builder';
import { idToTitle } from 'shared-api/utils/id-to-title';
import { dereference } from '@fumadocs/json-schema';
import { dereferenceBundledDocument } from '@/utils/document/dereference';

/** the `_openapi` data of pages */
export interface InternalOpenAPIMeta {
  method?: string;
  webhook?: boolean;
  deprecated?: boolean;
  preload?: string[];
}

export function toStaticData(
  page: GeneratedPageProps,
  doc: Document,
): {
  toc: TOCItemType[];
  structuredData: StructuredData;
} {
  const proxied = dereferenceBundledDocument(doc).dereferenced;
  const slugger = new Slugger();
  const toc: TOCItemType[] = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  function pathItem(item: OperationObject, defaultTitle: string) {
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
    const operation = dereference(proxied.paths?.[item.path])?.[item.method];
    if (!operation) continue;

    pathItem(operation, item.path);
  }

  for (const item of page.webhooks ?? []) {
    const webhook = dereference(proxied.webhooks?.[item.name])?.[item.method];
    if (!webhook) continue;

    pathItem(webhook, item.name);
  }

  return { toc, structuredData };
}
