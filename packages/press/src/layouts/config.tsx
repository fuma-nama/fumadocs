import type { FumapressConfig } from '@/config/global';
import { getSource } from '@/lib/source';
import type { DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import type { HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import { FumadocsLogo } from '@/components/logo';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { getConfigRuntime } from '@/config/load-runtime';

export function layoutConfig(config: FumapressConfig) {
  const { base } = config.layout ?? {};

  return {
    async base() {
      let defaultConfig: BaseLayoutProps | undefined;
      if (typeof base === 'function') defaultConfig = await base();
      else if (typeof base === 'object') defaultConfig = base;

      return {
        ...defaultConfig,
        nav: {
          title: (
            <>
              <FumadocsLogo className="size-5" />
              Fumapress
            </>
          ),
          ...defaultConfig?.nav,
        },
      };
    },
    async docs(): Promise<DocsLayoutProps> {
      const config = await getConfigRuntime();
      const source = await getSource(config);
      return {
        tree: source.getPageTree(),
        ...(await this.base()),
      };
    },
    async home(): Promise<HomeLayoutProps> {
      return this.base();
    },
  };
}
