import type { Suggestion } from '@/components/not-found';
import { DataSourceId, orama } from '@/lib/orama/client';

export async function getSuggestions(pathname: string): Promise<Suggestion[]> {
  const results = await orama.search({
    term: pathname,
    mode: 'vector',
    datasources: [DataSourceId],
    groupBy: {
      properties: ['url'],
      max_results: 1,
    },
  });

  if (!results?.groups) return [];

  return results.groups.map((group) => {
    const doc = group.result[0];

    return {
      id: doc.id,
      href: doc.document.url as string,
      title: doc.document.title as string,
    };
  });
}
