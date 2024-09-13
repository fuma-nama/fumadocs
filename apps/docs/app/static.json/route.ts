import { NextResponse } from 'next/server';
import { type DocumentRecord } from 'fumadocs-core/search-algolia/server';
import { utils } from '@/app/source';

export const revalidate = false;

export function GET(): Response {
  const results: DocumentRecord[] = [];
  const pages = utils.getPages();

  for (const page of pages) {
    results.push({
      _id: page.url,
      structured: page.data.structuredData,
      tag: page.slugs[0],
      url: page.url,
      title: page.data.title,
      description: page.data.description,
    });
  }

  return NextResponse.json(results);
}
