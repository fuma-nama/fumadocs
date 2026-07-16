import * as module from 'node:module';
import type { CoreOptions } from '@/core';
import type { MacroPluginOption } from '@/macro/options';

export interface NodeLoaderOptions extends Pick<CoreOptions, 'configPath' | 'outDir' | 'plugins'> {
  /**
   * Configure the macro API (`fumadocs-mdx/macro`), or `false` to disable it.
   *
   * `macro.include` patterns are matched with picomatch against paths relative to cwd.
   */
  macro?: MacroPluginOption;

  /**
   * Skip meta file transformation step
   */
  disableMetaFile?: boolean;
}

export function register(options: NodeLoaderOptions = {}) {
  module.register('./_loader.js', import.meta.url, {
    data: options,
  });
}
