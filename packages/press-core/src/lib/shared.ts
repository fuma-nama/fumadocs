import type { Config, ConfigContext } from '@/config';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { getGitRootDir } from './fs';
import path from 'node:path';
import type { LoaderOutput } from 'fumadocs-core/source';
import type { Awaitable } from './types';
import type { ServerPlugin } from '@/plugins';

export interface AppContext<C extends ConfigContext = ConfigContext> {
  config: InternalConfig;
  getLoader: () => Awaitable<LoaderOutput<C['loaderConfig']>>;
  plugins: ServerPlugin[];

  /** always `undefined`, easier way to infer types */
  $context: C;
}

export interface InternalConfig {
  site: {
    name: string;
    git?: {
      user: string;
      repo: string;
      branch: string;
      rootDir: string;
    };
  };
}

export function parseConfig<C extends ConfigContext>(config: Config<C>): InternalConfig {
  return {
    site: {
      name: config.site?.name ?? 'Fumapress',
      git: config.site?.git
        ? {
            ...config.site.git,
            rootDir: config.site.git.rootDir ?? getGitRootDir() ?? process.cwd(),
          }
        : undefined,
    },
  };
}

export function getGitHubFileUrl(config: InternalConfig, absolutePath: string): string | undefined {
  const { git } = config.site;
  if (!git) return;

  const p = path.relative(git.rootDir, absolutePath).replaceAll(path.sep, '/');
  if (p.startsWith('../')) return;

  return `https://github.com/${git.user}/${git.repo}/blob/${git.branch}/${p}`;
}

export function baseOptions(config: InternalConfig): BaseLayoutProps {
  const { name, git } = config.site;

  return {
    nav: {
      title: name,
    },
    githubUrl: git ? `https://github.com/${git.user}/${git.repo}` : undefined,
  };
}
