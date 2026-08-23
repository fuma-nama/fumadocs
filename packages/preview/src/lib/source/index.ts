import { loader } from 'fumadocs-core/source';
import { revalidable } from '@/lib/revalidable';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { getPages } from './storage';
import type { ParsedAppConfig } from '@/config/global';

export const getSource = revalidable({
  async create(config: ParsedAppConfig) {
    const out = await getPages(config.content);
    return loader({
      source: {
        files: [...out.metas, ...out.pages],
      },
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
