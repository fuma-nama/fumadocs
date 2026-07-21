import { pathToFileURL } from 'node:url';
import type { Core } from '@/core';
import type { BuildEnvironment, DocCollectionItem, LoadedConfig } from '@/config/build';
import type { BuildMDXOptions, CompiledMDXProperties } from '@/loaders/mdx/build';
import type { PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
import { resolveLastModified } from '@/loaders/mdx/last-modified';
import type { MdxCompileOptions, Data, MdastPluginInput, MdastPluginDefinition } from 'satteri';
import type { SatteriPresetOptions } from '@fumadocs/satteri/preset';
import type { ExtraPluginHooks } from '@fumadocs/satteri/compile';

export type CompiledSatteriMDXProperties<Frontmatter = Record<string, unknown>> =
  CompiledMDXProperties<Frontmatter>;

export async function buildSatteriMDX(
  core: Core,
  collection: DocCollectionItem | undefined,
  { filePath, frontmatter, source, _compiler, environment, isDevelopment }: BuildMDXOptions,
): Promise<{ code: string }> {
  const satteriOptions = await getSatteriOptions(core.getConfig(), collection, environment);
  const format = filePath.endsWith('.mdx') ? 'mdx' : 'md';
  const postprocess: PostprocessOptions = {
    _format: format,
    ...collection?.postprocess,
  };
  const [{ compileMdx }, { remarkLlms }, { remarkInclude }] = await Promise.all([
    import(/* turbopackOptional: true */ '@fumadocs/satteri/compile'),
    import(/* turbopackOptional: true */ '@fumadocs/satteri/remark-llms'),
    import(/* turbopackOptional: true */ '@fumadocs/satteri/remark-include'),
  ]);

  const data: Data = {
    frontmatter,
    _compiler,
    _cwd: collection?.cwd,
    _valueToExport: collection?.postprocess?.valueToExport,
  };

  const mdastPlugins: MdastPluginInput[] = [remarkInclude({ cwd: collection?.cwd })];
  if (satteriOptions.mdastPlugins) mdastPlugins.push(...satteriOptions.mdastPlugins);
  if (postprocess.includeProcessedMarkdown) {
    mdastPlugins.push(
      remarkLlms(
        typeof postprocess.includeProcessedMarkdown === 'object'
          ? postprocess.includeProcessedMarkdown
          : undefined,
      ),
    );
  }
  mdastPlugins.push(
    postprocessPlugin(postprocess, await resolveLastModified(collection, filePath)),
  );

  const result = await compileMdx({
    source,
    filePath,
    format,
    frontmatter,
    isDevelopment,
    environment,
    options: {
      ...satteriOptions,
      fileURL: pathToFileURL(filePath),
      data,
      mdastPlugins,
    },
  });

  return { code: result.code };
}

declare module 'satteri' {
  interface DataMap {
    extractedReferences?: { href: string }[];
  }
}

function postprocessPlugin(
  { extractLinkReferences = false }: PostprocessOptions,
  lastModified: Date | undefined,
): MdastPluginDefinition & ExtraPluginHooks {
  return {
    name: 'remark-postprocess',
    heading(node, ctx) {
      const frontmatter = (ctx.data.frontmatter ??= {});
      if (!frontmatter.title && node.depth === 1) {
        frontmatter.title = ctx.textContent(node);
      }
    },
    link(node, ctx) {
      if (extractLinkReferences) {
        const refs = (ctx.data.extractedReferences ??= []);
        refs.push({ href: node.url });
      }
    },
    collectExports({ data, addExport }) {
      if (extractLinkReferences) {
        addExport('extractedReferences', JSON.stringify((data.extractedReferences ??= [])));
      }

      if (lastModified) {
        addExport('lastModified', `new Date(${lastModified.getTime()})`);
      }
    },
    afterToJs({ result }) {
      if (extractLinkReferences) result.data.extractedReferences ??= [];
    },
  };
}

const satteriOptionsCache = new WeakMap<
  LoadedConfig,
  Map<string, MdxCompileOptions | Promise<MdxCompileOptions>>
>();

export type SatteriOptionsInput =
  | SatteriPresetOptions
  | ((environment: BuildEnvironment) => SatteriPresetOptions | Promise<SatteriPresetOptions>)
  | undefined;

async function resolvePresetOptions(
  input: SatteriOptionsInput,
  environment: BuildEnvironment,
): Promise<MdxCompileOptions> {
  const options = typeof input === 'function' ? await input(environment) : input;
  const { applySatteriPreset } = await import(
    /* turbopackOptional: true */ '@fumadocs/satteri/preset'
  );
  return applySatteriPreset(options)(environment);
}

function getSatteriOptions(
  config: LoadedConfig,
  collection?: DocCollectionItem,
  environment: BuildEnvironment = 'bundler',
): MdxCompileOptions | Promise<MdxCompileOptions> {
  let cache = satteriOptionsCache.get(config);
  if (!cache) {
    cache = new Map();
    satteriOptionsCache.set(config, cache);
  }

  const key = collection ? `${environment}:${collection.name}` : environment;
  const cached = cache.get(key);
  if (cached) return cached;

  let result: MdxCompileOptions | Promise<MdxCompileOptions>;

  if (collection?.compiler === 'satteri') {
    result = resolvePresetOptions(
      collection.satteriOptions ?? config.global.satteriOptions,
      environment,
    );
  } else if (collection) {
    throw new Error(
      `Collection "${collection.name}" uses the default MDX compiler. Use getMDXOptions() instead of getSatteriOptions().`,
    );
  } else {
    result = resolvePresetOptions(config.global.satteriOptions, environment);
  }

  cache.set(key, result);
  return result;
}
