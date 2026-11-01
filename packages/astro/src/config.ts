import type { LoaderOutput } from 'fumadocs-core/source';
import type { FumadocsConfig } from './app';

export type { DocsPageData, DocsPageProps, FumadocsConfig, Plugin } from './app';

// oxlint-disable-next-line typescript/no-explicit-any
export function defineConfig<Source extends LoaderOutput<any>>(
  config: FumadocsConfig<Source>,
): FumadocsConfig<Source> {
  return config;
}
