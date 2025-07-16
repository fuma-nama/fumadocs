import { SortedResult } from '@/server';
import Mixedbread from '@mixedbread/sdk';
import { VectorStoreSearchResponse } from '@mixedbread/sdk/resources/vector-stores';

export interface SearchMetadata {
  title?: string;
  description?: string;
  url?: string;
  tag?: string;
}

export interface MixedbreadOptions {
  /**
   * The ID of the vector store to search in
   */
  vectorStoreId: string;

  /**
   * The Mixedbread SDK client instance
   */
  client: Mixedbread;

  /**
   * Filter results with specific tag.
   */
  tag?: string;

  /**
   * Filter by locale (unsupported at the moment)
   */
  locale?: string;
}

type VectorStoreSearchResult = VectorStoreSearchResponse['data'][number] & {
  generated_metadata: SearchMetadata;
};

export async function search(
  query: string,
  options: MixedbreadOptions,
): Promise<SortedResult[]> {
  const { client, vectorStoreId, tag } = options;

  if (!query.trim()) {
    return [];
  }

  const res = await client.vectorStores.search({
    query,
    vector_store_ids: [vectorStoreId],
    top_k: 10,
    search_options: {
      return_metadata: true,
    },
  });

  const results = (res.data as VectorStoreSearchResult[])
    .filter((item) => {
      const metadata = item.generated_metadata;
      return !tag || metadata.tag === tag;
    })
    .flatMap((item) => {
      const metadata = item.generated_metadata;

      const url = metadata.url || '#';
      const title = metadata.title || 'Untitled';

      const results: SortedResult[] = [
        {
          id: `${item.file_id}-${item.chunk_index}-page`,
          type: 'page',
          content: title,
          url,
        },
      ];

      if (metadata.description) {
        results.push({
          id: `${item.file_id}-${item.chunk_index}-text`,
          type: 'text',
          content: metadata.description,
          url,
        });
      }

      return results;
    });

  return results;
}
