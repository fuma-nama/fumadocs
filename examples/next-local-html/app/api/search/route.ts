import { getSource } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// the structured data of processed HTML pages is indexed automatically
export const { GET } = createFromSource(getSource, {
  language: 'english',
});
