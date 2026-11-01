import { renderRoute } from 'fumadocs-core/server';
import Page from '../page';

// the counters in it, like the page
export const revalidate = 86400;

export async function GET() {
  return new Response(await renderRoute(<Page />), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
