import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source/llms';

export const revalidate = false;

export async function GET() {
  return new Response(llms(await source.get()).index());
}
