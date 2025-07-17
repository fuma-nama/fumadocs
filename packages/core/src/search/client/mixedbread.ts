import { SortedResult } from '@/server';
import Mixedbread from '@mixedbread/sdk';
import { VectorStoreSearchResponse } from '@mixedbread/sdk/resources/vector-stores';
import { marked } from 'marked';

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

function extractHeadingTitle(text: string): string {
  const trimmedText = text.trim();

  if (!trimmedText.startsWith('#')) {
    return '';
  }

  const lines = trimmedText.split('\n');
  const firstLine = lines[0]?.trim();

  if (firstLine) {
    // Remove the hash symbols first
    const headingText = firstLine.replace(/^#+\s*/, '');

    // Use marked to parse markdown and extract plain text
    const htmlString = marked.parse(headingText, { async: false });

    // Strip HTML tags to get plain text and remove colons
    const plainText = htmlString
      .replace(/<[^>]*>/g, '')
      .replace(/:/g, '')
      .trim();

    return plainText;
  }

  return '';
}

function convertToKebabCase(text: string): string {
  return text.toLowerCase().replace(/ /g, '-');
}

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
    filters: {
      key: 'tag',
      operator: 'eq',
      value: tag,
    },
    search_options: {
      return_metadata: true,
    },
  });

  const results = (res.data as VectorStoreSearchResult[]).flatMap((item) => {
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

    const headingTitle =
      item.type === 'text' ? extractHeadingTitle(item.text) : '';

    if (headingTitle) {
      results.push({
        id: `${item.file_id}-${item.chunk_index}-text`,
        type: 'heading',
        content: headingTitle,
        url: `${url}#${convertToKebabCase(headingTitle)}`,
      });
    }

    return results;
  });

  return results;
}
