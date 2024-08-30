import path from 'node:path';
import fs from 'node:fs';
import { watcher } from '@/map/watcher';
import { loadConfigCached } from '@/config/cached';
import { generateJS, generateTypes } from '@/map/generate';

export async function start(
  dev: boolean,
  configPath: string,
  outName: string,
): Promise<void> {
  let configHash = 0;
  let config = await loadConfigCached(configPath, configHash.toString());
  const jsOut = path.resolve('.source', `${outName}.js`);
  const typeOut = path.resolve('.source', `${outName}.d.ts`);

  if (dev) {
    const instance = watcher(configPath, config);

    instance.on('ready', () => {
      console.log('[MDX] started dev server');
    });

    instance.on('all', (event, file) => {
      const onUpdate = async (): Promise<void> => {
        const isConfigFile = path.resolve(file) === configPath;

        if (isConfigFile) {
          configHash++;
          config = await loadConfigCached(configPath, configHash.toString());
          fs.writeFileSync(typeOut, generateTypes(configPath, config, typeOut));
          console.log('[MDX] Updated map types');
        }

        if (isConfigFile || event !== 'change') {
          fs.writeFileSync(
            jsOut,
            await generateJS(configPath, config, jsOut, configHash.toString()),
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

  fs.mkdirSync('.source', { recursive: true });
  fs.writeFileSync(
    jsOut,
    await generateJS(configPath, config, jsOut, configHash.toString()),
  );
  fs.writeFileSync(typeOut, generateTypes(configPath, config, typeOut));
  console.log('[MDX] Initialized map file');
}
