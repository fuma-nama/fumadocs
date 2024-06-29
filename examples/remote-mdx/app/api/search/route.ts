import { createSearchAPI } from 'fumadocs-core/search/server';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'node:fs/promises';

let cachedContent: string | undefined;
let api: ReturnType<typeof createSearchAPI>;

export async function GET(req: NextRequest): Promise<NextResponse> {
  let content =
    process.env.NODE_ENV === 'development' ? undefined : cachedContent;

  if (!content) {
    content = await fs
      .readFile( process.env.NODE_ENV === 'production'? './.next/search-index.json' :'./dist/search-index.json')
      .then((res) => res.toString())
      .catch(() => '[]'); // skip if not built
  }

  if (!api || cachedContent !== content) {
    api = createSearchAPI('advanced', {
      indexes: JSON.parse(content),
    });
    cachedContent = content;
  }

  return api.GET(req);
}
