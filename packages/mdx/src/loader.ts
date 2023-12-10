import path from 'node:path';
import { sync } from 'fast-glob';
import type { LoaderContext } from 'webpack';

export interface LoaderOptions {
  rootContentPath: string;
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
  const { cwd, rootContentPath } = this.getOptions();

  this.cacheable(true);
  this.addContextDependency(path.resolve(cwd, rootContentPath));

  callback(null, buildMap({ cwd, rootContentPath }));
}

function buildMap({ cwd, rootContentPath }: LoaderOptions): string {
  const files = sync('./**/*.{md,mdx,json}', {
    cwd: path.resolve(cwd, rootContentPath),
  });

  const entries = files.map((file) => {
    const importPath = path.join(rootContentPath, file);

    return `${JSON.stringify(file)}: await import(${JSON.stringify(
      importPath,
    )})`;
  });

  return `export const map = {${entries.join(',')}}`;
}
