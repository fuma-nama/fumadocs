import type { AsyncAPIObject } from '@/types';
import Slugger, { slug } from 'github-slugger';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { GeneratedPageProps } from './builder';
import { dereferenceBundledDocument } from '../document/dereference';
import { resolveOperation } from '../schema';

export function toStaticData(
  page: GeneratedPageProps,
  document: AsyncAPIObject,
): {
  toc: TOCItemType[];
  structuredData: StructuredData;
} {
  const doc = dereferenceBundledDocument(document).dereferenced;
  const slugger = new Slugger();
  const toc: TOCItemType[] = [];
  const structuredData: StructuredData = { headings: [], contents: [] };

  function content(text: string | undefined, heading: string | undefined) {
    if (text) structuredData.contents.push({ content: text, heading });
  }

  for (const item of page.operations ?? []) {
    const info = resolveOperation(doc, item.id);
    if (!info) continue;
    // anchors of an operation are under its heading when the page shows titles
    let prefix = '';
    let heading: string | undefined;

    if (page.showTitle) {
      heading = slugger.slug(info.title);
      prefix = `${heading}.`;

      toc.push({ depth: 2, title: info.title, url: `#${heading}` });
      structuredData.headings.push({ content: info.title, id: heading });
    }

    content(info.description, heading);
    if (info.channel.description !== info.description) content(info.channel.description, heading);

    for (const { id, name, message } of info.messages) {
      const anchor = `${prefix}messages.${slug(id)}`;

      structuredData.headings.push({ content: name, id: anchor });
      content(message.summary, anchor);
      content(message.description, anchor);
    }
  }

  return { toc, structuredData };
}
