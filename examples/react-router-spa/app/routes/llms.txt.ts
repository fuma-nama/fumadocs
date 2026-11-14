import { docsLlms } from '@/lib/source';

export async function loader() {
  return (await docsLlms.serve('/llms.txt'))!;
}
