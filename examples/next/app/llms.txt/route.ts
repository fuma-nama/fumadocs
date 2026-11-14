import { docsLlms } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  return (await docsLlms.serve('/llms.txt'))!;
}
