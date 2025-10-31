import { createCore, findConfigFile } from '@/core';
import { createMdxLoader } from '@/loaders/mdx';
import { toNode } from '@/loaders/adapter';
import { createStandaloneConfigLoader } from '@/loaders/config';
import type { LoadHook } from 'node:module';
import { createMetaLoader } from '@/loaders/meta';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';

const core = createCore({
  environment: 'node',
  configPath: findConfigFile(),
  outDir: '.source',
});

const configLoader = createStandaloneConfigLoader({
  core,
  buildConfig: true,
  mode: 'production',
});

const mdxLoader = toNode(createMdxLoader(configLoader), mdxLoaderGlob);
const metaLoader = toNode(createMetaLoader(configLoader), metaLoaderGlob);

export const load: LoadHook = (url, context, nextLoad) => {
  return mdxLoader(url, context, (v, ctx) =>
    metaLoader(v, { ...context, ...ctx }, nextLoad),
  );
};
