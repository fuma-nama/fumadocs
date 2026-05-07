import { _Defaults, createCore } from '@/core';
import type { NodeLoaderOptions } from '.';
import type { InitializeHook, LoadFnOutput, LoadHook, LoadHookContext } from 'node:module';
import { createStandaloneConfigLoader } from '@/loaders/config';
import { toNode } from '@/loaders/adapter';
import { createMdxLoader } from '@/loaders/mdx';
import { createMetaLoader } from '@/loaders/meta';

let cachedLoaders: LoadHook[] | undefined;

export const initialize: InitializeHook<NodeLoaderOptions> = (options) => {
  const core = createCore({
    environment: 'node-loader',
    ...options,
    configPath: options.configPath ?? _Defaults.configPath,
    outDir: options.outDir ?? _Defaults.outDir,
  });

  const configLoader = createStandaloneConfigLoader({
    core,
    buildConfig: true,
    mode: 'production',
  });

  cachedLoaders = [toNode(createMdxLoader(configLoader))];
  if (!options.disableMetaFile) {
    cachedLoaders.push(toNode(createMetaLoader(configLoader)));
  }
};

export const load: LoadHook = async (url, context, nextLoad) => {
  if (!cachedLoaders) throw new Error('not initialized');
  const hooks = cachedLoaders;

  function run(
    i: number,
    url: string,
    context: LoadHookContext,
  ): LoadFnOutput | Promise<LoadFnOutput> {
    if (i >= hooks.length) {
      return nextLoad(url, context);
    }

    return hooks[i](url, context, (url, ctx) => run(i + 1, url, { ...context, ...ctx }));
  }

  return run(0, url, context);
};
