import type { LayoutConfig } from '../layouts/config';
import type { ContentConfig } from '../lib/source';

export interface FumapressConfig {
  layout?: LayoutConfig;
  content?: ContentConfig;
}

export function defineConfig(config: Partial<FumapressConfig> = {}): FumapressConfig {
  return {
    ...config,
    layout: {
      base() {
        return {
          nav: {
            title: 'Fumapress',
          },
        };
      },
      ...config.layout,
    },
  };
}
