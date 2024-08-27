import path from 'node:path';
import fg from 'fast-glob';
import type { LoaderContext } from 'webpack';
import { findConfigFile, loadConfig, type LoadedConfig } from '@/config/load';

export interface LoaderOptions {
  configPath?: string;

  rootContentDir: string;
  rootMapFile: string;

  /**
   * Included files in the map file
   *
   * @defaultValue '.&#47;**&#47;*.&#123;md,mdx,json&#125;'
   */
  include?: string | string[];
}

let cachedConfig: LoadedConfig | undefined;

export function getCachedConfig(): LoadedConfig | undefined {
  return cachedConfig;
}

/**
 * Load the root `.map.ts` file
 */
export default async function loader(
  this: LoaderContext<LoaderOptions>,
  _source: string,
  callback: LoaderContext<LoaderOptions>['callback'],
): Promise<void> {
  const { rootMapFile, configPath = findConfigFile() } = this.getOptions();
  const config = await loadConfig(configPath);
  cachedConfig = config;

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

  const imports: string[] = [];
  const sources: string[] = [];

  await Promise.all(
    Object.entries(config).map(async ([name, collection]) => {
      const files = new Set<string>();
      const entries: string[] = [];

      const dirs = Array.isArray(collection.dir)
        ? collection.dir
        : [collection.dir];
      await Promise.all(
        dirs.map(async (dir) => {
          const included = await fg(collection.files ?? ['**/*'], {
            cwd: dir,
          });

          included.forEach((item) => files.add(item));
        }),
      );

      Array.from(files.values()).forEach((file, i) => {
        let importPath = path.relative(mapDir, file).replaceAll(path.sep, '/');

        if (!importPath.startsWith('.')) {
          importPath = `./${importPath}`;
        }

        const importName = `file_${i.toString()}`;
        imports.push(
          `import * as ${importName} from ${JSON.stringify(importPath)};`,
        );
        entries.push(`${JSON.stringify(file)}: ${importName}`);
      });

      sources.push(`export const ${name} = {${entries.join(',')}}`);
    }),
  );

  callback(null, [...imports, ...sources].join('\n'));
}
