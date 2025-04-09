import { createCompiler, type MDXOptions } from '@fumadocs/mdx-remote';
import type { LoadedConfig } from '@/utils/config';
import { remarkInclude } from '@/mdx-plugins/remark-include';
import {
  remarkStructure,
  type StructuredData,
} from 'fumadocs-core/mdx-plugins';
import { createMDXSource, _runtime } from '@/runtime/index';
import type { RuntimeAsync } from '@/runtime/types';

async function initCompiler(config: LoadedConfig, collection: string) {
  let mdxOptions: MDXOptions | undefined;

  const col = config.collections.get(collection);
  if (col?.type === 'doc') mdxOptions = col.mdxOptions as MDXOptions;
  else if (col?.type === 'docs')
    mdxOptions = col.docs?.mdxOptions as MDXOptions;

  if (!mdxOptions) {
    config._mdx_async ??= {};
    config._mdx_async.cachedMdxOptions ??=
      typeof config.global?.mdxOptions === 'function'
        ? await config.global.mdxOptions()
        : (config.global?.mdxOptions ?? {});

    mdxOptions = config._mdx_async.cachedMdxOptions;
  }

  const remarkPlugins = mdxOptions.remarkPlugins ?? [];

  return createCompiler({
    ...mdxOptions,
    remarkPlugins: (v) =>
      typeof remarkPlugins === 'function'
        ? [remarkInclude, ...remarkPlugins(v), remarkStructure]
        : [remarkInclude, ...v, ...remarkPlugins, remarkStructure],
  });
}

export const _runtimeAsync: RuntimeAsync = {
  doc(files, collection, config) {
    const init = initCompiler(config, collection);

    return files.map(({ info: file, data, content }) => {
      return {
        ...data,
        _file: file,
        async load() {
          const compiler = await init;
          const out = await compiler.compile({
            source: content,
            filePath: file.absolutePath,
          });

          return {
            body: out.body,
            toc: out.toc,
            structuredData: out.vfile.data.structuredData as StructuredData,
            _exports: out.exports ?? {},
          };
        },
      };
    }) as any;
  },
  docs(docs, metas, collection, config) {
    const parsedDocs = this.doc(docs, collection, config);
    const parsedMetas = _runtime.meta(metas);

    return {
      docs: parsedDocs,
      meta: parsedMetas,
      toFumadocsSource() {
        return createMDXSource(parsedDocs, parsedMetas);
      },
    } as any;
  },
};

export { buildConfig } from '@/config/build';
