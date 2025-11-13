import { Core, createCore } from '@/core';

export interface WebpackLoaderOptions {
  configPath: string;
  outDir: string;
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
