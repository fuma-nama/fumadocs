import { docsLlms } from '@/lib/source';

export async function GET() {
  return (await docsLlms.serve('/llms-full.txt'))!;
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
