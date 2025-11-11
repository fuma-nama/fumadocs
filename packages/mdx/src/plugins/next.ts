import type { LoadedConfig } from '@/config/build';
import type { Plugin } from '@/core';
import { generateServerIndexFile } from '@/utils/generate-index-file';

export default function next(): Plugin {
  let config: LoadedConfig;
  let shouldEmitOnChange = false;

  return {
    name: 'next',
    config(v) {
      config = v;

      // always emit again when async mode enabled
      shouldEmitOnChange = config.collectionList.some((collection) => {
        return (
          (collection.type === 'doc' && collection.async) ||
          collection.type === 'docs' ||
          collection.type === 'meta'
        );
      });
    },
    configureServer(server) {
      if (!server.watcher) return;

      server.watcher.on('all', async (event) => {
        if (event === 'change' && !shouldEmitOnChange) return;

        await this.core.emitAndWrite({
          filterPlugin: (plugin) => plugin.name === 'next',
        });
      });
    },
    async emit() {
      return [
        {
          path: 'index.ts',
          // TODO: implement meta entries validation.
          content: await generateServerIndexFile({
            config,
            configPath: this.configPath,
            outDir: this.outDir,
          }),
        },
      ];
    },
  };
}
