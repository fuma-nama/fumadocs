import type { BunPlugin } from 'bun';
import { createMdxLoader } from '@/loaders/mdx';
import { findConfigFile, resolvedConfig } from '@/loaders/config';
import { buildConfig } from '@/config/build';
import { parse } from 'node:querystring';
import { pathToFileURL } from 'node:url';

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
