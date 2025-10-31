import type { BunPlugin } from 'bun';
import { createMdxLoader } from '@/loaders/mdx';
import { buildConfig } from '@/config/build';
import { parse } from 'node:querystring';
import { pathToFileURL } from 'node:url';
import { type CoreOptions, createCore, findConfigFile } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';

export type MdxPluginOptions = Partial<CoreOptions>;

export function createMdxPlugin(options: MdxPluginOptions = {}): BunPlugin {
  const {
    environment = 'bun',
    outDir = '.source',
    configPath = findConfigFile(),
  } = options;

  async function getMdxLoader() {
    const importPath = pathToFileURL(configPath).href;
    const core = await createCore({
      environment,
      outDir,
      configPath,
    }).init({
      config: buildConfig(await import(importPath)),
    });

    return createMdxLoader(createIntegratedConfigLoader(core));
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
