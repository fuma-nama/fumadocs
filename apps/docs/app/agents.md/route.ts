import fs from 'node:fs/promises';

export const revalidate = false;

export async function GET() {
  return new Response(await fs.readFile('./components/agent-instructions.md'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
