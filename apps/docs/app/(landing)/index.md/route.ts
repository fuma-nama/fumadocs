import { landingMarkdown } from '../markdown';

// the counters in it, like the page
export const revalidate = 86400;

export async function GET() {
  return new Response(await landingMarkdown(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
