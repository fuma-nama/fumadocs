import type { AsyncAPIObject } from '@/types';
import Slugger, { slug } from 'github-slugger';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { GeneratedPageProps } from './builder';
import { dereference } from '@fumadocs/json-schema';
import { dereferenceBundledDocument } from '../document/dereference';
import { getMessageDisplayName, getOperationDisplayName, getOperationMessages } from '../schema';
import { applyMessageTraits, applyOperationTraits } from '../traits';

export function toStaticData(
  page: GeneratedPageProps,
  doc: AsyncAPIObject,
): {
  toc: TOCItemType[];
  structuredData: StructuredData;
} {
  const proxied = dereferenceBundledDocument(doc).dereferenced;
  const slugger = new Slugger();
  const toc: TOCItemType[] = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  function content(text: string | undefined, heading: string | undefined) {
    if (text) structuredData.contents.push({ content: text, heading });
  }

  for (const item of page.operations ?? []) {
    const found = dereference(proxied.operations?.[item.id]);
    if (!found) continue;
    const operation = applyOperationTraits(found);
    // anchors of an operation are under its heading when the page shows titles
    let prefix = '';
    let heading: string | undefined;

    if (page.showTitle) {
      const title = getOperationDisplayName(item.id, operation);
      heading = slugger.slug(title);
      prefix = `${heading}.`;

      toc.push({ depth: 2, title, url: `#${heading}` });
      structuredData.headings.push({ content: title, id: heading });
    }

    const channel = dereference(operation.channel);
    content(operation.description, heading);
    if (channel.description !== operation.description) content(channel.description, heading);

    for (const { key, value } of getOperationMessages(operation.messages, channel)) {
      const message = applyMessageTraits(dereference(value));
      const id = `${prefix}messages.${slug(key)}`;

      structuredData.headings.push({ content: getMessageDisplayName(key, message), id });
      content(message.summary, id);
      content(message.description, id);
    }
  }

  return { toc, structuredData };
}
