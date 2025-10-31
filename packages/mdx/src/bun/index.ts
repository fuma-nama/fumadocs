import type { BunPlugin } from 'bun';
import { createMdxLoader } from '@/loaders/mdx';
import { buildConfig } from '@/config/build';
import { pathToFileURL } from 'node:url';
import { type CoreOptions, createCore, findConfigFile } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import { toBun } from '@/loaders/adapter';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';

export type MdxPluginOptions = Partial<CoreOptions>;

export function createMdxPlugin(options: MdxPluginOptions = {}): BunPlugin {
  const {
    environment = 'bun',
    outDir = '.source',
    configPath = findConfigFile(),
  } = options;

  return {
    name: 'bun-plugin-fumadocs-mdx',
    async setup(build) {
      const importPath = pathToFileURL(configPath).href;
      const core = await createCore({
        environment,
        outDir,
        configPath,
      }).init({
        config: buildConfig(await import(importPath)),
      });

      const configLoader = createIntegratedConfigLoader(core);
      toBun(createMdxLoader(configLoader), mdxLoaderGlob)(build);
      toBun(createMetaLoader(configLoader), metaLoaderGlob)(build);
    },
  };
}
