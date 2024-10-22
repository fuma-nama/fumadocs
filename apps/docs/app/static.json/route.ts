import { NextResponse } from 'next/server';
import { type DocumentRecord } from 'fumadocs-core/search/algolia';
import { source } from '@/app/source';

export const revalidate = false;

export async function GET(): Promise<Response> {
  const pages = source.getPages();
  const results = await Promise.all<DocumentRecord>(
    pages.map(async (page) => {
      const { structuredData } = await page.data.load();

      return {
        _id: page.url,
        structured: structuredData,
        tag: page.slugs[0],
        url: page.url,
        title: page.data.title,
        description: page.data.description,
      };
    }),
  );

  return NextResponse.json(results);
}
