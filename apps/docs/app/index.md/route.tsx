import { renderRoute } from 'fumadocs-core/server';
import Page from '@/app/[lang]/(landing)/page';
import { cacheLife } from 'next/cache';

// the counters in it, like the page
async function render() {
  'use cache';
  cacheLife({ revalidate: 86400 });
  return renderRoute(<Page />);
}

export async function GET() {
  return new Response(await render(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
