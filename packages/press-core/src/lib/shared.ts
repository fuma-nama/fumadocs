import type { Config } from '@/config';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { getGitRootDir } from './fs';
import path from 'node:path';

export interface AppContext {
  config: InternalConfig;
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

export function parseConfig(config: Config): InternalConfig {
  return {
    ...config,
    site: {
      ...config.site,
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
