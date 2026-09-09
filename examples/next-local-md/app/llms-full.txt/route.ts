import { getDocsLlms } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  const docsLlms = await getDocsLlms();

  return new Response(await docsLlms.full());
}
