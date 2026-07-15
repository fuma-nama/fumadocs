import { createCore } from '@/core';
import type { NodeLoaderOptions } from '.';
import type { InitializeHook, LoadFnOutput, LoadHook, LoadHookContext } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import picomatch from 'picomatch';
import { createStandaloneConfigLoader } from '@/loaders/config';
import { toNode } from '@/loaders/adapter';
import { createMdxLoader } from '@/loaders/mdx';
import { createMetaLoader } from '@/loaders/meta';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';
import { createNodeEvaluator, MacroCollector } from '@/macro/eval';
import { slash } from '@/utils/codegen';

let cachedLoaders: LoadHook[] | undefined;

function toNodeMacro(include: string[], root: string): LoadHook {
  // align slash-less patterns with the glob semantics of other bundlers
  const matcher = picomatch(include, {
    ignore: ['**/node_modules/**'],
    basename: true,
  });

  return async (url, context, nextLoad) => {
    if (!url.startsWith('file:///')) return nextLoad(url, context);

    const file = fileURLToPath(new URL(url));
    const rel = slash(path.relative(root, file));
    if (rel.startsWith('..') || !matcher(rel)) return nextLoad(url, context);

    const loaded = await nextLoad(url, context);
    const code = loaded.source?.toString();

    const { MacroModuleId, transformMacroModule } = await import('@/macro/transform');
    if (!code || !code.includes(MacroModuleId)) return loaded;

    const result = await transformMacroModule({
      code,
      file,
      root,
      target: 'import',
    });
    if (!result) return loaded;

    // the transform output preserves the input language, keep the original format
    return {
      ...loaded,
      source: result.code,
      shortCircuit: true,
    };
  };
}

export const initialize: InitializeHook<NodeLoaderOptions> = (options) => {
  const core = createCore({
    environment: 'node-loader',
    ...options,
  });

  const configLoader = createStandaloneConfigLoader({
    core,
    buildConfig: true,
    mode: 'production',
  });

  const include = typeof options.include === 'string' ? [options.include] : (options.include ?? []);
  cachedLoaders = [];

  if (include.length > 0) {
    const root = process.cwd();
    core.macro = new MacroCollector({
      root,
      outDir: core.outDir,
      isDev: false,
      // the Node.js runtime cannot evaluate TypeScript natively
      evaluator: createNodeEvaluator({ root, outDir: core.outDir }),
    });

    cachedLoaders.push(toNodeMacro(include, root));
  }

  cachedLoaders.push(toNode(mdxLoaderGlob, createMdxLoader(configLoader)));
  if (!options.disableMetaFile) {
    cachedLoaders.push(toNode(metaLoaderGlob, createMetaLoader(configLoader, {})));
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
