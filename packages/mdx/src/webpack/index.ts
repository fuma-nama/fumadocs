import { type Core, createCore } from '@/core';
import { createNodeEvaluator, MacroCollector } from '@/macro/eval';

export interface WebpackLoaderOptions {
  type: 'webpack' | 'turbopack';
  /** absolute path */
  compiledConfigPath: string;
  /** absolute path */
  configPath: string;
  /** absolute path */
  outDir: string;
  isDev: boolean;

  /**
   * whether the macro API (`fumadocs-mdx/macro`) is enabled
   */
  macro?: boolean;
}

let core: Core;

/**
 * the mdx & meta loaders are separate modules, they share this instance (and hence one macro
 * collector) so that macro modules aren't evaluated twice.
 */
export function getCore(options: WebpackLoaderOptions) {
  if (core) return core;
  core = createCore({
    environment: 'webpack',
    outDir: options.outDir,
    configPath: options.configPath,
  });

  if (options.macro) {
    core.macro = new MacroCollector({
      root: core.root,
      outDir: core.outDir,
      isDev: options.isDev,
      // webpack/turbopack loaders run on Node.js, which cannot evaluate TypeScript natively
      evaluator: createNodeEvaluator({ outDir: core.outDir, root: core.root }),
    });
  }

  return core;
}
