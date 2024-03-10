import path from 'node:path';
import fg from 'fast-glob';
import type { LoaderContext } from 'webpack';

export interface LoaderOptions {
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
export default function loader(
  this: LoaderContext<LoaderOptions>,
  _source: string,
  callback: LoaderContext<LoaderOptions>['callback'],
): void {
  const options = this.getOptions();

  this.cacheable(true);
  this.addContextDependency(options.rootContentDir);

  callback(null, buildMap(options));
}

function buildMap({
  rootContentDir,
  rootMapFile,
  include = ['./**/*.{md,mdx,json}'],
}: LoaderOptions): string {
  const mapDir = path.dirname(rootMapFile);

  const files = fg.sync(include, {
    cwd: rootContentDir,
  });

  const imports: string[] = [];
  const entries: string[] = [];

  files.forEach((file, i) => {
    let importPath = path
      .relative(mapDir, path.join(rootContentDir, file))
      .replaceAll(path.sep, '/');

    if (!importPath.startsWith('.')) {
      importPath = `./${importPath}`;
    }

    const name = `file_${i}`;
    imports.push(`import * as ${name} from ${JSON.stringify(importPath)};`);
    entries.push(`${JSON.stringify(file)}: ${name}`);
  });

  return [imports.join('\n'), `export const map = {${entries.join(',')}}`].join(
    '\n',
  );
}
