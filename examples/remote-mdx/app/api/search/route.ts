import { getSearchIndexes } from '@/app/source';
import { createSearchAPI } from 'fumadocs-core/search/server';
 
export const { GET } = createSearchAPI('advanced', {
  indexes: await getSearchIndexes('advanced')
});