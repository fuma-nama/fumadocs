import { docsLlms } from '@/lib/source';

export async function GET() {
  return new Response(await docsLlms.full());
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
