import { docsLlms } from '@/lib/source';

export const revalidate = false;

export function GET() {
  return new Response(docsLlms.index());
}
