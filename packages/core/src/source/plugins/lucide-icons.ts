import type { LoaderPlugin } from '@/source';
import { iconPlugin } from '@/source/plugins/icon';
import { icons } from 'lucide-react';
import { createElement } from 'react';

/**
 * Convert icon names into Lucide Icons, requires `lucide-react` to be installed.
 */
export function lucideIconsPlugin(
  options: {
    defaultIcon?: keyof typeof icons;
  } = {},
): LoaderPlugin {
  const { defaultIcon } = options;
  return iconPlugin((icon = defaultIcon) => {
    if (icon === undefined) return;
    const Icon = icons[icon as keyof typeof icons];
    if (!icon) {
      console.warn(`[lucide-icons-plugin] Unknown icon detected: ${icon}.`);
      return;
    }

    return createElement(Icon);
  });
}
