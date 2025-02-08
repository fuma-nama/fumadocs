import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { getConfigHash, loadConfig } from '@/utils/config';
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
  // delete previous output
  void fs.rm(path.resolve(outDir, `index.js`), { force: true });
  void fs.rm(path.resolve(outDir, `index.d.ts`), { force: true });

  // init
  await fs.mkdir(outDir, { recursive: true });
  let configHash = await getConfigHash(configPath);
  let config = await loadConfig(configPath, configHash, true);
  const outPath = path.resolve(outDir, `index.ts`);

  const frontmatterCache = new Map<string, unknown>();
  let hookUpdate = false;

  async function readFrontmatterWithCache(file: string) {
    hookUpdate = true;
    const cached = frontmatterCache.get(file);
    if (cached) return cached;

    const res = await readFrontmatter(file);
    frontmatterCache.set(file, res);
    return res;
  }

  async function updateMapFile() {
    await fs.writeFile(
      outPath,
      await generateJS(
        configPath,
        config,
        outPath,
        configHash,
        readFrontmatterWithCache,
      ),
    );
  }

  console.time(`[MDX] initialize map file`);
  await updateMapFile();
  console.timeEnd(`[MDX] initialize map file`);

  if (dev) {
    const { watcher } = await import('@/map/watcher');
    const instance = watcher(configPath, config);

    instance.on('ready', () => {
      console.log('[MDX] started dev server');
    });

    instance.on('all', (event, file) => {
      if (typeof file !== 'string') return;

      const onUpdate = async () => {
        const isConfigFile = path.resolve(file) === configPath;

        if (isConfigFile) {
          configHash = await getConfigHash(configPath);
          config = await loadConfig(configPath, configHash, true);
        }

        if (isConfigFile || event !== 'change' || hookUpdate) {
          if (event === 'change') frontmatterCache.delete(file);

          await updateMapFile();
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
