import { getLLMText, getSource } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const docs = await getSource();
  const scan = docs.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\n\n'));
}
