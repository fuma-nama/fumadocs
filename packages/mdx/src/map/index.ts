import * as path from 'node:path';
import * as fs from 'node:fs';
import { writeFile } from 'node:fs/promises';
import grayMatter from 'gray-matter';
import { getConfigHash, loadConfigCached } from '@/utils/config-cache';
import { generateJS, generateTypes } from '@/map/generate';

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
  const jsOut = path.resolve(outDir, `index.js`);
  const typeOut = path.resolve(outDir, `index.d.ts`);

  const frontmatterCache = new Map<string, unknown>();
  let hookUpdate = false;

  /**
   * Read frontmatter via stream, it is faster for large Markdown/MDX files
   */
  async function readFrontmatter(file: string): Promise<unknown> {
    hookUpdate = true;
    const cached = frontmatterCache.get(file);
    if (cached) return cached;

    const readStream = fs.createReadStream(file, {
      highWaterMark: 250,
    });

    return new Promise((res, rej) => {
      let idx = 0;
      let str = '';

      readStream.on('data', (_chunk) => {
        const chunk = _chunk.toString();
        if (idx === 0 && !chunk.startsWith('---')) {
          res({});
          readStream.close();
          return;
        }

        str += chunk;
        idx++;

        if (str.includes('\n---')) {
          res(
            grayMatter({
              content: str,
            }).data,
          );

          readStream.close();
        }
      });

      readStream.on('end', () => res({}));
      readStream.on('error', (e) => rej(e));
    }).then((res) => {
      frontmatterCache.set(file, res);
      return res;
    });
  }

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

    instance.on('all', (event, file) => {
      if (typeof file !== 'string') return;

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
}
