import { getPages } from '@/app/source';
import { createSearchAPI } from 'next-docs-zeta/search/server';

export const { GET } = createSearchAPI('advanced', {
  indexes: getPages()!.map((page) => ({
    id: page.data._id,
    title: page.data.title,
    url: page.url,
    structuredData: page.data.structuredData,
  })),
});
