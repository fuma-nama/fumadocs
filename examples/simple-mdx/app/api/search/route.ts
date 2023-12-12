import { pages } from '@/app/source';
import { createSearchAPI } from 'next-docs-zeta/search/server';

export const { GET } = createSearchAPI('advanced', {
  indexes: pages.map((page) => ({
    title: page.matter.title,
    structuredData: page.data.structuredData,
    id: page.file.id,
    url: page.url,
  })),
});
