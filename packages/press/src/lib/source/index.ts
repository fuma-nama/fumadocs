import { type InferPageType, loader, source } from 'fumadocs-core/source';
import { getConfigRuntime } from '@/config/load-runtime';
import { revalidable } from '@/lib/revalidable';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { getPages } from './storage';

export const getSource = revalidable({
  async create() {
    const config = await getConfigRuntime();

    return loader({
      source: source(await getPages(config.content ?? {})),
      plugins: [lucideIconsPlugin()],
      baseUrl: '/',
    });
  },
  staleTime: 60 * 1000,
});

export type SourcePage = InferPageType<Awaited<ReturnType<typeof getSource>>>;

export function getPageImage(slugs: string[]) {
  const segments = [...slugs, 'image.webp'];

  return {
    segments,
    url: `/og/${segments.join('/')}`,
  };
}
