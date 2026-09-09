import { docsLlms } from '@/lib/source';

export function loader() {
  return new Response(docsLlms.index());
}
