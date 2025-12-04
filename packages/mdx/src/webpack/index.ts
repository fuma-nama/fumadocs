import { type Core, createCore } from '@/core';

export interface WebpackLoaderOptions {
  absoluteCompiledConfigPath: string;
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
