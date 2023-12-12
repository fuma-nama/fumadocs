import path from 'node:path';
import fg from 'fast-glob';
import type { LoaderContext } from 'webpack';

export interface LoaderOptions {
  rootContentPath: string;
  mapPath: string;
  cwd: string;
}

/**
 * Load the root `_map.ts` file
 */
export default function loader(
  this: LoaderContext<LoaderOptions>,
  _source: string,
  callback: LoaderContext<LoaderOptions>['callback'],
): void {
  const options = this.getOptions();

  this.cacheable(true);
  this.addContextDependency(path.resolve(options.cwd, options.rootContentPath));

  callback(null, buildMap(options));
}

function buildMap({ cwd, rootContentPath, mapPath }: LoaderOptions): string {
  const mapDir = path.dirname(mapPath);
  const absoluteContentPath = path.resolve(cwd, rootContentPath);

  // eslint-disable-next-line import/no-named-as-default-member -- commom.js
  const files = fg.sync('./**/*.{md,mdx,json}', {
    cwd: absoluteContentPath,
  });

  const entries = files.map((file) => {
    let importPath = path
      .relative(mapDir, path.join(absoluteContentPath, file))
      .replace(path.sep, '/');

    if (!importPath.startsWith('.')) {
      importPath = `./${importPath}`;
    }

    return `${JSON.stringify(file)}: await import(${JSON.stringify(
      importPath,
    )})`;
  });

  return `export const map = {${entries.join(',')}}`;
}
