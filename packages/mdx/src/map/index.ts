import path from 'node:path';
import fs from 'node:fs';
import { type EventName } from 'chokidar/handler.js';
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

  if (dev && !process.env._FUMADOCS_MDX) {
    process.env._FUMADOCS_MDX = '1';
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
          fs.writeFileSync(typeOut, generateTypes(configPath, config, typeOut));
          console.log('[MDX] Updated map types');
        }

        if (isConfigFile || event !== 'change') {
          fs.writeFileSync(
            jsOut,
            await generateJS(configPath, config, jsOut, configHash),
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

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    jsOut,
    await generateJS(configPath, config, jsOut, configHash),
  );
  fs.writeFileSync(typeOut, generateTypes(configPath, config, typeOut));
  console.log('[MDX] initialized map file');

  if (config.global?.generateManifest && !dev) {
    process.on('exit', () => {
      console.log('[MDX] writing manifest');
      writeManifest(manifestPath, config);
    });
  }
}
