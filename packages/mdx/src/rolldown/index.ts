import { buildConfig } from '@/config/build';
import { _Defaults, createCore } from '@/core';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';
import { toVite } from '@/loaders/adapter';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMdxLoader } from '@/loaders/mdx';
import { createMetaLoader } from '@/loaders/meta';
import fs from 'node:fs/promises';
import type { RolldownPlugin } from 'rolldown';

export interface PluginOptions {
  configPath?: string;
  outDir?: string;
}

export default async function mdx(
  config: Record<string, unknown> | Promise<Record<string, unknown>>,
  options?: PluginOptions,
): Promise<RolldownPlugin[]> {
  const core = createCore({
    configPath: options?.configPath ?? _Defaults.configPath,
    outDir: options?.outDir ?? _Defaults.outDir,
    environment: 'rolldown',
  });
  await core.init({
    config: buildConfig(await config, process.cwd()),
  });

  const configLoader = createIntegratedConfigLoader(core);
  const mdxLoader = toVite(createMdxLoader(configLoader));
  const metaLoader = toVite(
    createMetaLoader(configLoader, {
      // rolldown has built-in plugin for JSON files
      json: 'json',
    }),
  );

  return [
    {
      name: 'fumadocs-mdx',
      load: {
        filter: { id: [metaLoaderGlob, mdxLoaderGlob] },
        // Rolldown couldn't read the correct file path when query params exist.
        async handler(id) {
          const idx = id.lastIndexOf('?');
          if (idx === -1) return null;

          return fs.readFile(id.slice(0, idx), 'utf-8');
        },
      },
    },
    {
      name: 'fumadocs-mdx:mdx',
      transform: {
        filter: mdxLoader.filter,
        handler: mdxLoader.transform,
      },
    },
    {
      name: 'fumadocs-mdx:meta',
      transform: {
        filter: metaLoader.filter,
        handler: metaLoader.transform,
      },
    },
  ];
}
