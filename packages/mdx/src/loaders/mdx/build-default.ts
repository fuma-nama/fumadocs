import { applyMdxPreset } from '@/config/preset';
import type { BuildEnvironment, DocCollectionItem, LoadedConfig } from '@/config/build';
import type { Core } from '@/core';
import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import { remarkInclude } from 'fumadocs-core/mdx-plugins/remark-include';
import { VFile } from 'vfile';
import type { Transformer } from 'unified';
import type { Nodes, Root, RootContent } from 'mdast';
import { type PostprocessOptions, remarkPostprocess } from './remark-postprocess';
import { walk } from './mdast-utils';
import { resolveLastModified } from './last-modified';
import type { BuildMDXOptions } from './build';

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
}

declare module 'vfile' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- extend data map
  interface DataMap extends FumadocsDataMap {}
}

export async function buildJSMDX(
  core: Core,
  collection: DocCollectionItem | undefined,
  {
    filePath,
    frontmatter,
    source,
    _compiler,
    environment,
    isDevelopment,
    importsOnly = false,
  }: BuildMDXOptions,
) {
  const mdxOptions = await getMDXOptions(core.getConfig(), collection, environment);

  function getProcessor(format: 'md' | 'mdx') {
    const cache = core.cache as Map<string, Processor>;
    const key = `build-mdx:${collection?.name ?? 'global'}:${format}:${importsOnly}`;
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
          [remarkInclude, { getProcessor }],
          ...(mdxOptions.remarkPlugins ?? []),
          importsOnly ? remarkImportsOnly : [remarkPostprocess, postprocessOptions],
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
    // collections render their outputs for the props of a page by default
    data: { frontmatter, _compiler, _analysis: collection && (collection.analysis ?? 'runtime') },
  });

  if (collection) {
    vfile = await core.transformVFile({ collection, filePath, source }, vfile);
  }
  // the processor is cached per collection, so this per-file value rides the vfile instead.
  // set after `transformVFile`, which may return a different vfile.
  const lastModified = await resolveLastModified(collection, filePath);
  if (lastModified) {
    vfile.data['mdx-export'] ??= [];
    vfile.data['mdx-export'].push({ name: 'lastModified', value: lastModified });
  }

  const out = await getProcessor(filePath.endsWith('.mdx') ? 'mdx' : 'md').process(vfile);
  return { code: String(out.value), map: out.map };
}

/**
 * Keep only the ESM, after the remark plugins that may add imports, so the other plugins have nothing to process.
 */
function remarkImportsOnly(): Transformer<Root, Root> {
  return (tree) => {
    const esm: RootContent[] = [];
    // ESM can be nested, e.g. from `<include>`
    walk<Nodes>(tree, (node) => {
      if (node.type !== 'mdxjsEsm') return;
      esm.push(node);
      return 'skip';
    });
    tree.children = esm;
  };
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
