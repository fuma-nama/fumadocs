import { NextResponse } from 'next/server';
import { source } from '@/lib/source';
import type { OramaDocument } from 'fumadocs-core/search/orama-cloud';

export const revalidate = false;

export async function GET(): Promise<Response> {
  const pages = source.getPages();
  const results = await Promise.all(
    pages.map(async (page) => {
      const { structuredData } = await page.data.load();

      return {
        id: page.url,
        structured: structuredData,
        tag: page.slugs[0],
        url: page.url,
        title: page.data.title,
        description: page.data.description,
      } satisfies OramaDocument;
    }),
  );

  return NextResponse.json(results);
}
