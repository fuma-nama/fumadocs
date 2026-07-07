import { applyMdxPreset } from '@/config/preset';
import type { BuildEnvironment, DocCollectionItem, LoadedConfig } from '@/config/build';
import type { Core } from '@/core';
import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import { VFile } from 'vfile';
import { remarkInclude } from './remark-include';
import { type PostprocessOptions, remarkPostprocess } from './remark-postprocess';
import type { BuildMDXOptions, CompilerOptions } from './build';

type Processor = ReturnType<typeof createProcessor>;

export interface FumadocsDataMap {
  /**
   * [Fumadocs MDX] raw frontmatter, you can modify it
   */
  frontmatter?: Record<string, unknown>;

  /**
   * [Fumadocs MDX] additional ESM exports to write
   */
  'mdx-export'?: { name: string; value: unknown }[];

  /**
   * [Fumadocs MDX] The compiler object from loader
   */
  _compiler?: CompilerOptions;

  /**
   * [Fumadocs MDX] get internal processor, do not use this on user land.
   */
  _getProcessor?: (format: 'md' | 'mdx') => Processor;
}

declare module 'vfile' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- extend data map
  interface DataMap extends FumadocsDataMap {}
}

export async function buildJSMDX(
  core: Core,
  collection: DocCollectionItem | undefined,
  { filePath, frontmatter, source, _compiler, environment, isDevelopment }: BuildMDXOptions,
) {
  const mdxOptions = await getMDXOptions(core.getConfig(), collection, environment);

  function getProcessor(format: 'md' | 'mdx') {
    const cache = core.cache as Map<string, Processor>;
    const key = `build-mdx:${collection?.name ?? 'global'}:${format}`;
    let processor = cache.get(key);

    if (!processor) {
      const postprocessOptions: PostprocessOptions = {
        _format: format,
        ...collection?.postprocess,
      };

      processor = createProcessor({
        outputFormat: 'program',
        development: isDevelopment,
        ...mdxOptions,
        remarkPlugins: [
          remarkInclude,
          ...(mdxOptions.remarkPlugins ?? []),
          [remarkPostprocess, postprocessOptions],
        ],
        format,
      });

      cache.set(key, processor);
    }

    return processor;
  }

  let vfile = new VFile({
    value: source,
    path: filePath,
    cwd: collection?.cwd,
    data: { frontmatter, _compiler, _getProcessor: getProcessor },
  });

  if (collection) {
    vfile = await core.transformVFile({ collection, filePath, source }, vfile);
  }

  const out = await getProcessor(filePath.endsWith('.mdx') ? 'mdx' : 'md').process(vfile);
  return { code: String(out.value), map: out.map };
}

const mdxOptionsCache = new WeakMap<
  LoadedConfig,
  Map<string, ProcessorOptions | Promise<ProcessorOptions>>
>();

function getMDXOptions(
  config: LoadedConfig,
  collection?: DocCollectionItem,
  environment: BuildEnvironment = 'bundler',
) {
  let cacheMap = mdxOptionsCache.get(config);
  if (!cacheMap) {
    cacheMap = new Map();
    mdxOptionsCache.set(config, cacheMap);
  }
  const key = collection ? `${environment}:${collection.name}` : environment;
  const cached = cacheMap.get(key);
  if (cached) return cached;
  let result: ProcessorOptions | Promise<ProcessorOptions>;

  if (collection?.mdxOptions) {
    const optionsFn = collection.mdxOptions;
    result = typeof optionsFn === 'function' ? optionsFn(environment) : optionsFn;
  } else {
    result = (async () => {
      const optionsFn = config.global.mdxOptions;
      const options = typeof optionsFn === 'function' ? await optionsFn() : optionsFn;

      return applyMdxPreset(options)(environment);
    })();
  }

  cacheMap.set(key, result);
  return result;
}
