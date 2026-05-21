import { getLLMText, source } from '@/lib/source';

export async function GET() {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);
  return new Response(scanned.join('\n\n'));
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
