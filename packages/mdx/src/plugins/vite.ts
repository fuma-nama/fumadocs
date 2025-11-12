import type { LoadedConfig } from '@/config/build';
import type { EmitEntry, Plugin } from '@/core';
import { emitIndexFiles } from '@/utils/generate-index-file';

export interface IndexFileOptions {
  /**
   * Runtime compat fallbacks for Vite specific APIs
   *
   * - `bun`: use Bun-specific APIs.
   * - `node`: use Node.js APIs.
   * - `false` (default): no fallback.
   */
  runtime?: 'bun' | 'node' | false;
  /**
   * add `.js` extensions to imports, needed for ESM without bundler resolution
   */
  addJsExtension?: boolean;

  /**
   * Generate entry point for browser environment
   *
   * @defaultValue true
   */
  browser?: boolean;
}

export default function vite({
  index,
}: {
  index: IndexFileOptions | boolean;
}): Plugin {
  let config: LoadedConfig;
  let indexOptions: Required<IndexFileOptions> | false;
  if (index === false) indexOptions = false;
  else indexOptions = applyDefaults(index === true ? {} : index);

  return {
    name: 'vite',
    config(v) {
      config = v;
    },
    configureServer(server) {
      if (
        !server.watcher ||
        indexOptions === false ||
        indexOptions.runtime === false
      )
        return;

      // for bun/node runtimes, alternative import.meta.glob has to be re-generated on update
      server.watcher.on('all', (event, file) => {
        if (event === 'change') return;
        const isUpdated = config.collectionList.some((collection) => {
          if (collection.type === 'docs')
            return (
              collection.docs.hasFile(file) || collection.meta.hasFile(file)
            );

          return collection.hasFile(file);
        });

        if (isUpdated) {
          this.core.emitAndWrite({
            filterPlugin: (plugin) => plugin.name === 'vite',
          });
        }
      });
    },
    async emit() {
      const out: EmitEntry[] = [];
      if (indexOptions === false) return out;

      return emitIndexFiles({
        config,
        configPath: this.configPath,
        outDir: this.outDir,
        target: indexOptions.runtime === false ? 'vite' : 'default',
        browser: indexOptions.browser,
      });
    },
  };
}

function applyDefaults(options: IndexFileOptions): Required<IndexFileOptions> {
  return {
    addJsExtension: options.addJsExtension ?? false,
    browser: options.browser ?? false,
    runtime: options.runtime ?? false,
  };
}
