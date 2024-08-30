import path from 'node:path';
import fg from 'fast-glob';
import type { LoaderContext } from 'webpack';
import { type FileInfo } from '@/config';
import { invalidateCache, loadConfigCached } from '@/config/cached';
import { getTypeFromPath } from '@/utils/get-type-from-path';

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
  invalidateCache(configPath);
  const config = await loadConfigCached(configPath);

  for (const collection of config.collections.values()) {
    for (const dir of Array.isArray(collection.dir)
      ? collection.dir
      : [collection.dir]) {
      this.addContextDependency(path.resolve(dir));
    }
  }

  this.cacheable(true);
  this.addDependency(configPath);

  const mapDir = path.dirname(rootMapFile);

  const imports: string[] = ['import { toRuntime } from "fumadocs-mdx"'];
  const importedCollections = new Set<string>();
  const sources: string[] = [];
  const files = new Set<string>();
  let importId = 0;

  function toImportPath(file: string): string {
    let importPath = path.relative(mapDir, file).replaceAll(path.sep, '/');

    if (!importPath.startsWith('.')) {
      importPath = `./${importPath}`;
    }

    return importPath;
  }

  await Promise.all(
    Array.from(config.collections.entries()).map(async ([name, collection]) => {
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
            if (getTypeFromPath(file) !== collection.type || files.has(file))
              continue;

            config._runtime.files.set(file, name);
            files.add(file);

            const importPath = toImportPath(file);
            const importName = `file_${(importId++).toString()}`;
            imports.push(
              `import * as ${importName} from ${JSON.stringify(importPath)}`,
            );

            const info: FileInfo = {
              path: path.relative(dir, file),
              absolutePath: file,
            };

            entries.push(
              `toRuntime("${collection.type}", ${importName}, ${JSON.stringify(info)})`,
            );
          }
        }),
      );

      if (collection.transform) {
        if (config.global) importedCollections.add('default'); // global config
        importedCollections.add(name);
        sources.push(
          `export const ${name} = await Promise.all([${entries.join(',')}].map(v => c_${name}.transform(v, c_default)))`,
        );
      } else {
        sources.push(`export const ${name} = [${entries.join(',')}]`);
      }
    }),
  );

  if (importedCollections.size > 0) {
    imports.push(
      `import { ${Array.from(importedCollections.values())
        .map((v) => `${v} as c_${v}`)
        .join(', ')} } from ${JSON.stringify(toImportPath(configPath))}`,
    );
  }

  callback(null, [...imports, ...sources].join('\n'));
}
