import * as module from 'node:module';
import type { CoreOptions } from '@/core';

export interface NodeLoaderOptions extends Partial<CoreOptions> {
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
