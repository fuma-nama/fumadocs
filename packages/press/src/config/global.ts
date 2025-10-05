import type { ContentConfig } from './content';

export interface FumapressConfig {
  /**
   * the directory for app files (relative to project root)
   *
   * @defaultValue './app'
   */
  appDir: string;

  content?: ContentConfig;
}

export function defineConfig(
  config: Partial<FumapressConfig>,
): FumapressConfig {
  return {
    ...config,
    appDir: config.appDir ?? './app',
  };
}
