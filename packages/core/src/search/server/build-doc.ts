import type { SharedIndex } from './build-index';

export interface SharedDocument {
  id: string;
  content: string;
  page_id: string;
  type: 'page' | 'heading' | 'text';
  breadcrumbs?: string[];
  tags: string[];
  url: string;
  locale?: string;
}

export function buildDocuments(indexes: SharedIndex[]) {
  const docs: SharedDocument[] = [];

  for (const page of indexes) {
    const pageTag = page.tag ?? [];
    const tags = Array.isArray(pageTag) ? pageTag : [pageTag];
    const data = page.structuredData;
    let id = 0;

    docs.push({
      id: page.id,
      page_id: page.id,
      type: 'page',
      content: page.title,
      breadcrumbs: page.breadcrumbs,
      tags,
      url: page.url,
      locale: page.locale,
    });

    const nextId = () => `${page.id}-${id++}`;

    if (page.description) {
      docs.push({
        id: nextId(),
        page_id: page.id,
        tags,
        type: 'text',
        url: page.url,
        content: page.description,
        locale: page.locale,
      });
    }

    for (const heading of data.headings) {
      docs.push({
        id: nextId(),
        page_id: page.id,
        type: 'heading',
        tags,
        url: `${page.url}#${heading.id}`,
        content: heading.content,
        locale: page.locale,
      });
    }

    for (const content of data.contents) {
      docs.push({
        id: nextId(),
        page_id: page.id,
        tags,
        type: 'text',
        url: content.heading ? `${page.url}#${content.heading}` : page.url,
        content: content.content,
        locale: page.locale,
      });
    }
  }

  return docs;
}
