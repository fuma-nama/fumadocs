import type { BunPlugin } from 'bun';
import { createMdxLoader } from '@/loaders/mdx';
import { buildConfig } from '@/config/build';
import { pathToFileURL } from 'node:url';
import { _Defaults, type CoreOptions, createCore } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import { toBun } from '@/loaders/adapter';

export interface MdxPluginOptions extends Partial<CoreOptions> {
  /**
   * Skip meta file transformation step
   */
  disableMetaFile?: boolean;
}

export function createMdxPlugin(options: MdxPluginOptions = {}): BunPlugin {
  const {
    environment = 'bun',
    outDir = _Defaults.outDir,
    configPath = _Defaults.configPath,
    disableMetaFile = false,
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
      toBun(createMdxLoader(configLoader))(build);
      if (!disableMetaFile) toBun(createMetaLoader(configLoader))(build);
    },
  };
}
