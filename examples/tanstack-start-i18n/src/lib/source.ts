import { loader } from 'fumadocs-core/source';
import * as icons from 'lucide-static';
import { defineDocs } from 'fumadocs-mdx/macro';
import { i18n } from '@/lib/i18n';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    async: true,
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  i18n,
  icon(icon) {
    if (!icon) {
      return;
    }

    if (icon in icons) return icons[icon as keyof typeof icons];
  },
});
