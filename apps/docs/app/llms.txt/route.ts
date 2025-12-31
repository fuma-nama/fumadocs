import { source } from '@/lib/source';
import { getSection } from '@/lib/source/navigation';

export const revalidate = false;

export async function GET() {
  const scanned: string[] = [];
  scanned.push('# Docs');
  const map = new Map<string, string[]>();

  for (const page of source.getPages()) {
    const section = getSection(page.slugs[0]);
    const list = map.get(section) ?? [];
    list.push(`- [${page.data.title}](${page.url}): ${page.data.description}`);
    map.set(section, list);
  }

  for (const [key, value] of map) {
    scanned.push(`## ${key}`);
    scanned.push(value.join('\n'));
  }

  return new Response(scanned.join('\n\n'));
}
