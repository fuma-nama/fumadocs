import { docsLlms } from '@/lib/llms';

export const revalidate = false;

export async function GET() {
  return (await docsLlms.serve('/llms.txt'))!;
}
