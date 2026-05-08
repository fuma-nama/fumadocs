import type { AppContext } from './lib/shared';
import type { LoaderConfig, LoaderOutput } from 'fumadocs-core/source';
import type { Awaitable } from './lib/types';
import type { ServerPlugin } from './plugins';
import type { Adapter } from './adapters';

export interface ConfigContext {
  loaderConfig: LoaderConfig;
}

export interface Config<C extends ConfigContext = ConfigContext> {
  /** the default content loader */
  loader: LoaderOutput<C['loaderConfig']> | (() => Awaitable<LoaderOutput<C['loaderConfig']>>);

  site?: SiteConfig;
  plugins?: ServerPlugin[] | ((ctx: AppContext<C>) => ServerPlugin[]);
  /** adapter for content sources, use `fumadocs-mdx` if not specified */
  adapters?: Adapter[];
}

export interface SiteConfig {
  name?: string;
  git?: {
    user: string;
    repo: string;
    branch: string;

    /** the root directory of git repo */
    rootDir?: string;
  };
}

export function defineConfig<C extends LoaderConfig>(
  config: Config<{
    loaderConfig: C;
  }>,
): Config<{ loaderConfig: C }> {
  return config;
}
