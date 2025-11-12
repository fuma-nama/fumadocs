import { createCore, findConfigFile } from '@/core';
import { createMdxLoader } from '@/loaders/mdx';
import { toNode } from '@/loaders/adapter';
import { createStandaloneConfigLoader } from '@/loaders/config';
import type { LoadHook } from 'node:module';
import { createMetaLoader } from '@/loaders/meta';

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

const mdxLoader = toNode(createMdxLoader(configLoader));
const metaLoader = toNode(createMetaLoader(configLoader));

export const load: LoadHook = (url, context, nextLoad) => {
  return mdxLoader(url, context, (v, ctx) =>
    metaLoader(v, { ...context, ...ctx }, nextLoad),
  );
};
