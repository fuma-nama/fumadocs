import { NextResponse } from 'next/server';
import { type OramaDocument } from 'fumadocs-core/search/orama-cloud';
import { source } from '@/lib/source';

export const revalidate = false;

export function GET() {
  const results: OramaDocument[] = [];

  for (const page of source.getPages()) {
    results.push({
      id: page.url,
      structured: page.data.structuredData,
      url: page.url,
      title: page.data.title,
      description: page.data.description,
    });
  }

  return NextResponse.json(results);
}
