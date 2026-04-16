import { source } from 'fumadocs-core/source';
import { getPages } from './storage';
import type { ChokidarOptions } from 'chokidar';

export interface LocalMarkdownConfig {
  /**
   * root directory for content files.
   */
  dir: string;
  /**
   * a list of glob patterns, customise the content files to be scanned.
   */
  include: string[];
  /**
   * directories to the static assets
   */
  assetsDir?: string[];
  /**
   * customise chokidar, by default, file watcher will watch all files under the `dir` directory.
   */
  watchOptions?: (options: ChokidarOptions) => ChokidarOptions;
}

export async function localMd(config: LocalMarkdownConfig) {
  return source(await getPages(config));
}
