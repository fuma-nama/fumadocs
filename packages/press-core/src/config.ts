import type { AppContext } from './lib/shared';
import type { LoaderConfig, LoaderOutput } from 'fumadocs-core/source';
import type { Awaitable, ServerPlugin, Adapter } from '@/lib/types';
import type { TranslationsOption } from 'fumadocs-ui/contexts/i18n';
import type { I18nConfig as CoreI18nConfig } from 'fumadocs-core/i18n';

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

  i18n?: I18nConfig;
}

export interface I18nConfig {
  /** locale code -> language info */
  languages: Record<
    string,
    {
      displayName: string;
      translations?: TranslationsOption;
    }
  >;
  defaultLanguage: string;
}

/** convert Fumapress i18n config to core i18n config */
export function coreI18n(i18n: I18nConfig): CoreI18nConfig {
  return {
    defaultLanguage: i18n.defaultLanguage,
    languages: Object.keys(i18n.languages),
  };
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
