import type { BunPlugin } from 'bun';
import { createMdxLoader } from '@/loaders/mdx';
import { resolvedConfig } from '@/loaders/config-loader';
import { findConfigFile } from '@/utils/config';
import { buildConfig } from '@/config/build';
import { parse } from 'node:querystring';

export interface MdxPluginOptions {
  configPath?: string;
}

export function createMdxPlugin(options: MdxPluginOptions = {}): BunPlugin {
  const { configPath = findConfigFile() } = options;

  async function getMdxLoader() {
    const out = buildConfig(await import(configPath));
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
          filePath: args.path,
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
