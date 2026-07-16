import { createCore } from '@/core';
import { createMdxLoader } from '@/loaders/mdx';
import { toNode } from '@/loaders/adapter';
import { createStandaloneConfigLoader } from '@/loaders/config';
import type { LoadHook } from 'node:module';
import { createMetaLoader } from '@/loaders/meta';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';

const core = createCore({
  environment: 'node',
});

const configLoader = createStandaloneConfigLoader({
  core,
  buildConfig: true,
  mode: 'production',
});

const mdxLoader = toNode(mdxLoaderGlob, createMdxLoader(configLoader));
const metaLoader = toNode(metaLoaderGlob, createMetaLoader(configLoader));

/**
 * @deprecated use the `register()` function from `fumadocs-mdx/node` instead.
 */
export const load: LoadHook = (url, context, nextLoad) => {
  return mdxLoader(url, context, (v, ctx) => metaLoader(v, { ...context, ...ctx }, nextLoad));
};
