import { docsLlms } from '@/lib/source';

export function GET() {
  return new Response(docsLlms.index());
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
