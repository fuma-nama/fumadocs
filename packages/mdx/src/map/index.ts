import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { getConfigHash, loadConfig } from '@/utils/config';
import { generateJS } from '@/map/generate';
import { fileCache } from '@/map/file-cache';
import { ValidationError } from '@/utils/validation';

/**
 * Start a MDX server that builds index and manifest files.
 *
 * In development mode, it starts a file watcher to auto-update output as your input changes.
 */
export async function start(
  dev: boolean,
  configPath: string,
  outDir: string,
): Promise<void> {
  // init
  let configHash = await getConfigHash(configPath);
  let config = await loadConfig(configPath, outDir, configHash, true);
  const outPath = path.resolve(outDir, `index.ts`);

  async function updateMapFile() {
    const start = performance.now();

    try {
      await fs.writeFile(
        outPath,
        await generateJS(
          configPath,
          config,
          { relativeTo: outDir },
          configHash,
        ),
      );
    } catch (err) {
      if (err instanceof ValidationError) {
        console.error(err.toStringFormatted());
      } else {
        console.error(err);
      }
    }

    console.log(`[MDX] updated map file in ${performance.now() - start}ms`);
  }

  await updateMapFile();

  if (dev) {
    const { watcher } = await import('@/map/watcher');
    const instance = watcher(configPath, config, [outPath]);

    instance.on('ready', () => {
      console.log('[MDX] started dev server');
    });

    instance.on('all', (event, file) => {
      if (typeof file !== 'string') return;
      const absolutePath = path.resolve(file);

      const onUpdate = async () => {
        const isConfigFile = absolutePath === configPath;

        if (isConfigFile) {
          configHash = await getConfigHash(configPath);
          config = await loadConfig(configPath, outDir, configHash, true);
        }

        if (event === 'change') fileCache.removeCache(absolutePath);

        await updateMapFile();
      };

      void onUpdate();
    });

    process.on('exit', () => {
      console.log('[MDX] closing dev server');
      void instance.close();
    });
  }
}
