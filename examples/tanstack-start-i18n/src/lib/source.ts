import { loader } from 'fumadocs-core/source';
import * as icons from 'lucide-static';
import { create, docs } from '../../source.generated';
import { i18n } from '@/lib/i18n';

export const source = loader({
  source: await create.sourceAsync(docs.doc, docs.meta),
  baseUrl: '/docs',
  i18n,
  // @ts-expect-error -- string
  icon(icon) {
    if (!icon) {
      return;
    }

    if (icon in icons) return icons[icon as keyof typeof icons];
  },
});
