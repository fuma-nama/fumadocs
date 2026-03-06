import { source } from '@/lib/source';

export async function GET() {
  const lines: string[] = [];
  lines.push('# Documentation');
  lines.push('');
  for (const page of source.getPages()) {
    lines.push(`- [${page.data.title}](${page.url}): ${page.data.description}`);
  }
  return new Response(lines.join('\n'));
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
