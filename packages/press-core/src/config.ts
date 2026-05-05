import type { ComponentType } from 'react';
import type { AppContext } from './lib/shared';

export interface Config {
  site?: SiteConfig;
  layouts?: Record<string, ComponentType<AppContext & Record<string, unknown>>>;
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

export function defineConfig(config: Config): Config {
  return config;
}
