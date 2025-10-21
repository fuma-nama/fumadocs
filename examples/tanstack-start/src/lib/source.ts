import { loader } from 'fumadocs-core/source';
import * as icons from 'lucide-static';
import { create, docs } from '@/.source';

export const source = loader({
  source: await create.sourceAsync(docs.doc, docs.meta),
  baseUrl: '/docs',
  icon(icon) {
    if (!icon) {
      return;
    }

    if (icon in icons) return icons[icon as keyof typeof icons];
  },
});
