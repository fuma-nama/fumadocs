import { type Core, type CoreOptions, createCore } from '@/core';

export interface WebpackLoaderOptions extends CoreOptions {
  compiledConfigPath: string;
  isDev: boolean;
}

let core: Core;

export function getCore(options: WebpackLoaderOptions) {
  return (core ??= createCore({
    environment: 'webpack',
    outDir: options.outDir,
    configPath: options.configPath,
  }));
}
