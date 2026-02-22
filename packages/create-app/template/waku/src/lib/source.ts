import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { docs } from 'fumadocs-mdx:collections/server';

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  plugins: [lucideIconsPlugin()],
});

export function getPageImage(slugs: string[]) {
  const segments = [...slugs, 'image.webp'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}
