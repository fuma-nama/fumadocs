import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

export const { GET } = createFromSource(source);

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
