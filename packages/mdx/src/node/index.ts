import * as module from 'node:module';
import type { CoreOptions } from '@/core';

export interface NodeLoaderOptions extends Pick<CoreOptions, 'configPath' | 'outDir' | 'plugins'> {
  /**
   * Enable the macro API (`fumadocs-mdx/macro`) for matching modules.
   *
   * Patterns are matched with picomatch against paths relative to cwd.
   */
  include?: string | string[];

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
