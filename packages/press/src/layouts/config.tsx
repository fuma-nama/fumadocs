import type { FumapressConfig } from '@/config/global';
import { getSource } from '@/lib/source';
import type { DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import type { HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { FumadocsLogo } from '@/components/logo';

type Awaitable<T> = T | Promise<T>;

export interface LayoutConfig {
  base?: () => Awaitable<BaseLayoutProps>;
}

export function layoutConfig(config: FumapressConfig) {
  return {
    async base() {
      if (config.layout?.base) return await config.layout.base();
      return {
        nav: {
          title: (
            <>
              <FumadocsLogo className="size-5" />
              Fumapress
            </>
          ),
        },
      };
    },
    async docs(): Promise<DocsLayoutProps> {
      const source = await getSource();
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
