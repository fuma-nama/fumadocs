import { globSync } from 'tinyglobby';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { GlobOptions } from '@/vite/generate';

export function importMetaGlob(
  patterns: string | string[],
  options: GlobOptions,
) {
  const baseDir = options.base;
  if (!baseDir) {
    throw new Error(
      "[import.meta.glob polyfill] base option is required as it cannot access the caller's import.meta.url",
    );
  }

  const result = globSync(patterns, {
    cwd: baseDir,
  });

  const imports: Record<string, () => Promise<unknown>> = {};

  for (const item of result) {
    const fullPath = path.join(baseDir, item);
    const url = pathToFileURL(fullPath);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      url.searchParams.set(k, v);
    }

    imports[item] = async () => {
      const mod = await import(url.href);

      if (options.import) return mod[options.import];
      return mod;
    };
  }

  return imports;
}
