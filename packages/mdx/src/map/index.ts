import path from 'node:path';
import fs from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { type EventName } from 'chokidar/handler.js';
import grayMatter from 'gray-matter';
import { getConfigHash, loadConfigCached } from '@/config/cached';
import { generateJS, generateTypes } from '@/map/generate';
import { writeManifest } from '@/map/manifest';

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
  const manifestPath = path.resolve(outDir, 'manifest.json');
  const jsOut = path.resolve(outDir, `index.js`);
  const typeOut = path.resolve(outDir, `index.d.ts`);

  const frontmatterCache = new Map<string, unknown>();
  let hookUpdate = false;

  // TODO: Stream and read only the header
  const readFrontmatter = async (file: string): Promise<unknown> => {
    const cached = frontmatterCache.get(file);
    if (cached) return cached;
    hookUpdate = true;

    return grayMatter({
      content: await readFile(file).then((res) => res.toString()),
    }).data;
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    jsOut,
    await generateJS(configPath, config, jsOut, configHash, readFrontmatter),
  );
  fs.writeFileSync(typeOut, generateTypes(configPath, config, typeOut));
  console.log('[MDX] initialized map file');

  if (dev) {
    const { watcher } = await import('@/map/watcher');
    const instance = watcher(configPath, config);

    instance.on('ready', () => {
      console.log('[MDX] started dev server');
    });

    instance.on('all', (event: EventName, file: string) => {
      const onUpdate = async (): Promise<void> => {
        const isConfigFile = path.resolve(file) === configPath;

        if (isConfigFile) {
          configHash = await getConfigHash(configPath);
          config = await loadConfigCached(configPath, configHash);
          await writeFile(typeOut, generateTypes(configPath, config, typeOut));
          console.log('[MDX] Updated map types');
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

  if (config.global?.generateManifest && !dev) {
    process.on('exit', () => {
      console.log('[MDX] writing manifest');
      writeManifest(manifestPath, config);
    });
  }
}
