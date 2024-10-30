import { NextResponse } from 'next/server';
import { source } from '@/app/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';

export const revalidate = false;

export type Static = {
  id: string;
  structured: StructuredData;
  tag: string;
  url: string;
  title: string;
  description?: string;
};

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
      } satisfies Static;
    }),
  );

  return NextResponse.json(results);
}
