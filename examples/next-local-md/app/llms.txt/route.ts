import { getSource } from '@/lib/source';
import { llms } from 'fumadocs-core/source';

export const revalidate = false;

export async function GET() {
  return new Response(llms(await getSource()).index());
}
