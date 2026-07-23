import { loader, source } from 'fumadocs-core/source';
import { revalidable } from '@/lib/revalidable';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { getPages } from './storage';
import type { ParsedAppConfig } from '@/config/global';

export const getSource = revalidable({
  async create(config: ParsedAppConfig) {
    return loader({
      source: source(await getPages(config.content)),
      plugins: [lucideIconsPlugin()],
      baseUrl: '/',
    });
  },
});

export type Source = Awaited<ReturnType<typeof getSource>>;
export type SourcePage = Source['$inferPage'];

export function getPageImageUrl(page: SourcePage) {
  const segments = [...page.slugs, 'image.webp'];

  return '/' + [page.locale, 'og', ...segments].filter(Boolean).join('/');
}
