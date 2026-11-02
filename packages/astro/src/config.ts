import type { LoaderOutput } from 'fumadocs-core/source';
import type { FumadocsConfig } from './app';

export type {
  App,
  DocsPageData,
  DocsPageProps,
  FumadocsConfig,
  PageBody,
  Plugin,
  Route,
} from './app';

// oxlint-disable-next-line typescript/no-explicit-any
export function defineConfig<Source extends LoaderOutput<any>>(
  config: FumadocsConfig<Source>,
): FumadocsConfig<Source> {
  return config;
}
