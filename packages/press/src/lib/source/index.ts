import { loader, source } from 'fumadocs-core/source';
import { revalidable } from '@/lib/revalidable';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { getPages } from './storage';
import { FumapressConfig } from '@/config/global';

export const getSource = revalidable({
  async create(config: FumapressConfig) {
    return loader({
      source: source(await getPages(config.content ?? {})),
      plugins: [lucideIconsPlugin()],
      baseUrl: '/',
    });
  },
});

export type Source = Awaited<ReturnType<typeof getSource>>;
export type SourcePage = Source['$inferPage'];

export function getPageImage(slugs: string[]) {
  const segments = [...slugs, 'image.webp'];

  return {
    segments,
    url: `/og/${segments.join('/')}`,
  };
}
