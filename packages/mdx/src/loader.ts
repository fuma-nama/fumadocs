import path from 'node:path';
import fg from 'fast-glob';
import type { LoaderContext } from 'webpack';
import { findConfigFile, loadConfig } from '@/utils/config';

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

/**
 * Load the root `.map.ts` file
 */
export default async function loader(
  this: LoaderContext<LoaderOptions>,
  _source: string,
  callback: LoaderContext<LoaderOptions>['callback'],
): Promise<void> {
  const {
    rootMapFile,
    configPath = findConfigFile(),
    include = ['./**/*.{md,mdx,json}'],
  } = this.getOptions();

  this.cacheable(true);
  for (const v of )
  this.addContextDependency(rootContentDir);
  this.addDependency(configPath);

  const mapDir = path.dirname(rootMapFile);
  const files = fg.sync(include, {
    cwd: rootContentDir,
  });

  const imports: string[] = [];
  const entries: string[] = [];
  const config = await loadConfig(configPath);
  config['sdf']

  files.forEach((file, i) => {
    let importPath = path
      .relative(mapDir, path.join(rootContentDir, file))
      .replaceAll(path.sep, '/');

    if (!importPath.startsWith('.')) {
      importPath = `./${importPath}`;
    }

    const name = `file_${i.toString()}`;
    imports.push(`import * as ${name} from ${JSON.stringify(importPath)};`);
    entries.push(`${JSON.stringify(file)}: ${name}`);
  });

  callback(
    null,
    [imports.join('\n'), `export const map = {${entries.join(',')}}`].join(
      '\n',
    ),
  );
}
