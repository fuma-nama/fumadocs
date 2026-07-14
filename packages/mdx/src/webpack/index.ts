import { type Core, createCore } from '@/core';
import type { MacroContext } from '@/macro/eval';

export interface WebpackLoaderOptions {
  absoluteCompiledConfigPath: string;
  configPath: string;
  outDir: string;
  isDev: boolean;

  /**
   * whether the macro API (`fumadocs-mdx/macro`) is enabled
   */
  macro?: boolean;
}

let core: Core;

export function getCore(options: WebpackLoaderOptions) {
  return (core ??= createCore({
    environment: 'webpack',
    outDir: options.outDir,
    configPath: options.configPath,
  }));
}

export function getMacroContext(options: WebpackLoaderOptions): MacroContext | undefined {
  if (!options.macro) return;

  return {
    root: process.cwd(),
    outDir: options.outDir,
    isDev: options.isDev,
  };
}
