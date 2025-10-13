import type { BunPlugin } from 'bun';
import { createMdxLoader } from '@/loaders/mdx';
import { findConfigFile, resolvedConfig } from '@/loaders/config';
import { buildConfig } from '@/config/build';
import { parse } from 'node:querystring';
import { pathToFileURL } from 'node:url';
import { globSync } from 'tinyglobby';
import path from 'node:path';
import type { GlobImportOptions } from '@/utils/glob-import';

export interface MdxPluginOptions {
  configPath?: string;
}

export function createMdxPlugin(options: MdxPluginOptions = {}): BunPlugin {
  const { configPath = findConfigFile() } = options;

  async function getMdxLoader() {
    const importPath = pathToFileURL(configPath).href;
    const out = buildConfig(await import(importPath));
    return createMdxLoader(resolvedConfig(out));
  }

  return {
    name: 'bun-plugin-fumadocs-mdx',
    setup(build) {
      const mdxLoader = getMdxLoader();

      build.onLoad({ filter: /\.mdx(\?.+?)?$/ }, async (args) => {
        const [filePath, query] = args.path.split('?', 2);
        const content = await Bun.file(filePath).text();

        const result = await (
          await mdxLoader
        )({
          source: content,
          query: parse(query),
          filePath,
          development: false,
          compiler: {
            addDependency() {},
          },
        });

        return {
          contents: result.code,
          loader: 'js',
        };
      });
    },
  };
}

/**
 * Fallback for `import.meta.glob` in Bun
 *
 * @internal
 */
export function importMetaGlob(
  patterns: string | string[],
  options: GlobImportOptions,
) {
  const result = globSync(patterns, {
    cwd: options.base,
  });

  const imports: Record<string, () => Promise<unknown>> = {};

  for (const item of result) {
    const fullPath = path.join(options.base, item);
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
