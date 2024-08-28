import path from 'node:path';
import fg from 'fast-glob';
import type { LoaderContext } from 'webpack';
import { type FileInfo } from '@/config';
import { loadConfigCached } from '@/config/cached';

export interface LoaderOptions {
  configPath: string;

  rootContentDir: string;
  rootMapFile: string;

  /**
   * Included files in the map file
   *
   * @defaultValue '.&#47;**&#47;*.&#123;md,mdx,json&#125;'
   */
  include?: string | string[];
}

/**
 * Load the root `.map.ts` file
 */
export default async function loader(
  this: LoaderContext<LoaderOptions>,
  _source: string,
  callback: LoaderContext<LoaderOptions>['callback'],
): Promise<void> {
  const { rootMapFile, configPath } = this.getOptions();
  const config = await loadConfigCached(configPath);

  this.cacheable(true);

  for (const collection of Object.values(config)) {
    for (const dir of Array.isArray(collection.dir)
      ? collection.dir
      : [collection.dir]) {
      this.addContextDependency(path.resolve(dir));
    }
  }

  this.addDependency(configPath);

  const mapDir = path.dirname(rootMapFile);

  const imports: string[] = ['import { toRuntime } from "fumadocs-mdx"'];
  const sources: string[] = [];
  const files = new Set<string>();
  let importId = 0;

  await Promise.all(
    Object.entries(config).map(async ([name, collection]) => {
      const entries: string[] = [];

      const dirs = Array.isArray(collection.dir)
        ? collection.dir
        : [collection.dir];
      await Promise.all(
        dirs.map(async (dir) => {
          const included = await fg(collection.files ?? ['**/*'], {
            cwd: dir,
            absolute: true,
          });

          for (const file of included) {
            if (files.has(file)) continue;
            files.add(file);

            let importPath = path
              .relative(mapDir, file)
              .replaceAll(path.sep, '/');

            if (!importPath.startsWith('.')) {
              importPath = `./${importPath}`;
            }

            const importName = `file_${(importId++).toString()}`;
            imports.push(
              `import * as ${importName} from ${JSON.stringify(importPath)}`,
            );
            const info: FileInfo = {
              path: path.relative(dir, file),
              absolutePath: file,
            };
            entries.push(`toRuntime(${importName}, ${JSON.stringify(info)})`);
          }
        }),
      );

      sources.push(`export const ${name} = [${entries.join(',')}]`);
    }),
  );

  callback(null, [...imports, ...sources].join('\n'));
}
