import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const { GET } = createFromSource(source, (page) => ({
  title: page.data.title,
  description: page.data.description,
  url: page.url,
  id: page.url,
  structuredData: page.data.structuredData,
  // use your desired value, like page.slugs[0]
  tag: "<value>"
}));
