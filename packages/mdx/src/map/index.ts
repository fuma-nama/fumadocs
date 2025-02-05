import * as path from 'node:path';
import * as fs from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { getConfigHash, loadConfigCached } from '@/utils/config-cache';
import { generateJS } from '@/map/generate';
import { readFrontmatter } from '@/utils/read-frontmatter';

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
  let configHash = await getConfigHash(configPath);
  let config = await loadConfigCached(configPath, configHash);
  const jsOut = path.resolve(outDir, `index.ts`);

  const frontmatterCache = new Map<string, unknown>();
  let hookUpdate = false;

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    jsOut,
    await generateJS(configPath, config, jsOut, configHash, (file) => {
      hookUpdate = true;
      const cached = frontmatterCache.get(file);
      if (cached) return cached;

      return readFrontmatter(file).then((res) => {
        frontmatterCache.set(file, res);
        return res;
      });
    }),
  );
  console.log('[MDX] initialized map file');

  if (dev) {
    const { watcher } = await import('@/map/watcher');
    const instance = watcher(configPath, config);

    instance.on('ready', () => {
      console.log('[MDX] started dev server');
    });

    instance.on('all', (event, file) => {
      if (typeof file !== 'string') return;

      const onUpdate = async (): Promise<void> => {
        const isConfigFile = path.resolve(file) === configPath;

        if (isConfigFile) {
          configHash = await getConfigHash(configPath);
          config = await loadConfigCached(configPath, configHash);
        }

        if (isConfigFile || event !== 'change' || hookUpdate) {
          if (event === 'change') frontmatterCache.delete(file);

          await writeFile(
            jsOut,
            await generateJS(
              configPath,
              config,
              jsOut,
              configHash,
              readFrontmatter,
            ),
          );

          console.log('[MDX] Updated map file');
        }
      };

      void onUpdate();
    });

    process.on('exit', () => {
      console.log('[MDX] closing dev server');
      void instance.close();
    });
  }
}
