import { pathToFileURL } from 'node:url';
import type { Core } from '@/core';
import type { BuildEnvironment, DocCollectionItem, LoadedConfig } from '@/config/build';
import type { BuildMDXOptions, CompiledMDXProperties } from '@/loaders/mdx/build';
import type { PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
import type {
  MdxCompileOptions,
  Data,
  MdastPluginInput,
  MdastVisitorContext,
  MdastPluginDefinition,
} from 'satteri';
import type { SatteriPresetOptions } from '@fumadocs/satteri/preset';

export type CompiledSatteriMDXProperties<Frontmatter = Record<string, unknown>> =
  CompiledMDXProperties<Frontmatter>;

export async function buildSatteriMDX(
  core: Core,
  collection: DocCollectionItem | undefined,
  { filePath, frontmatter, source, _compiler, environment, isDevelopment }: BuildMDXOptions,
): Promise<{ code: string }> {
  const satteriOptions = await getSatteriOptions(core.getConfig(), collection, environment);
  const postprocess: PostprocessOptions = {
    _format: filePath.endsWith('.mdx') ? 'mdx' : 'md',
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

  const postprocessPlugins: MdastPluginInput[] = [postprocessPlugin(postprocess)];
  if (postprocess.includeProcessedMarkdown) {
    postprocessPlugins.unshift(
      remarkLlms(
        typeof postprocess.includeProcessedMarkdown === 'object'
          ? postprocess.includeProcessedMarkdown
          : undefined,
      ),
    );
  }

  const result = await compileMdx({
    source,
    filePath,
    frontmatter,
    isDevelopment,
    environment,
    options: {
      ...satteriOptions,
      fileURL: pathToFileURL(filePath),
      data,
      mdastPlugins: [
        remarkInclude({ cwd: collection?.cwd }),
        ...(satteriOptions.mdastPlugins ?? []),
        ...postprocessPlugins,
      ],
    },
  });

  return { code: result.code };
}

function postprocessPlugin(options: PostprocessOptions): MdastPluginDefinition {
  return {
    name: 'remark-postprocess',
    heading(node, ctx: MdastVisitorContext) {
      const frontmatter = (ctx.data.frontmatter ??= {});
      if (!frontmatter.title && node.depth === 1) {
        frontmatter.title = ctx.textContent(node);
      }
    },
    link(node, ctx) {
      if (!options.extractLinkReferences) return;
      const refs = (ctx.data.extractedReferences ??= []);
      refs.push({ href: node.url });
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
