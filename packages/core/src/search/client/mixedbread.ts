import type { SortedResult } from '@/search';
import type Mixedbread from '@mixedbread/sdk';
import removeMd from 'remove-markdown';
import Slugger from 'github-slugger';
import type { StoreSearchResponse } from '@mixedbread/sdk/resources/stores';

export interface MixedbreadOptions {
  /**
   * The identifier of the store to search in
   */
  storeIdentifier: string;

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

export interface SearchMetadata {
  title?: string;
  description?: string;
  url?: string;
  tag?: string;
}

type StoreSearchResult = StoreSearchResponse['data'][number] & {
  generated_metadata: SearchMetadata;
};

const slugger = new Slugger();

function extractHeadingTitle(text: string): string {
  const trimmedText = text.trim();

  if (!trimmedText.startsWith('#')) {
    return '';
  }

  const lines = trimmedText.split('\n');
  const firstLine = lines[0]?.trim();

  if (firstLine) {
    // Use remove-markdown to convert to plain text and remove colons
    return removeMd(firstLine, {
      useImgAltText: false,
    });
  }

  return '';
}

export async function search(query: string, options: MixedbreadOptions): Promise<SortedResult[]> {
  const { client, storeIdentifier, tag } = options;

  if (!query.trim()) {
    return [];
  }

  const res = await client.stores.search({
    query,
    store_identifiers: [storeIdentifier],
    top_k: 10,
    filters: {
      key: 'generated_metadata.tag',
      operator: 'eq',
      value: tag,
    },
    search_options: {
      return_metadata: true,
    },
  });

  return (res.data as StoreSearchResult[]).flatMap((item) => {
    const metadata = item.generated_metadata;

    const url = metadata.url || '#';
    const title = metadata.title || 'Untitled';

    const chunkResults: SortedResult[] = [
      {
        id: `${item.file_id}-${item.chunk_index}-page`,
        type: 'page',
        content: title,
        url,
      },
    ];

    const headingTitle = item.type === 'text' ? extractHeadingTitle(item.text) : '';

    if (headingTitle) {
      slugger.reset();

      chunkResults.push({
        id: `${item.file_id}-${item.chunk_index}-heading`,
        type: 'heading',
        content: headingTitle,
        url: `${url}#${slugger.slug(headingTitle)}`,
      });
    }

    return chunkResults;
  });
}
