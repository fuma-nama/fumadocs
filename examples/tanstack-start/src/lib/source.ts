import { loader } from 'fumadocs-core/source';
import * as icons from 'lucide-static';
import { docs } from '@/.source/index';

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  icon(icon) {
    if (!icon) {
      return;
    }

    if (icon in icons) return icons[icon as keyof typeof icons];
  },
});
