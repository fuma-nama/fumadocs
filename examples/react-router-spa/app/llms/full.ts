import { docsLlms } from '@/lib/source';

export async function loader() {
  return new Response(await docsLlms.full());
}
