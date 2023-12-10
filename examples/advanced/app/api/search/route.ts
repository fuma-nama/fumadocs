import { allDocs } from 'contentlayer/generated';
import { createSearchAPI } from 'next-docs-zeta/search/server';

export const { GET } = createSearchAPI('advanced', {
  indexes: allDocs.map((page) => ({
    id: page._id,
    title: page.title,
    content: page.body.raw,
    url: page.url,
    structuredData: page.structuredData,
    tag: '',
  })),
  tag: true,
});
