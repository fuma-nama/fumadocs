export interface FumapressConfig {
  /**
   * the directory for app files (relative to project root)
   *
   * @defaultValue './app'
   */
  appDir: string;
}

export function defineConfig(
  config: Partial<FumapressConfig>,
): FumapressConfig {
  return {
    appDir: config.appDir ?? './app',
  };
}
