import { renderRoute } from 'fumadocs-core/server';
import Page from '../showcase/page';

export const dynamic = 'force-static';

export async function GET() {
  return new Response(await renderRoute(<Page />), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
