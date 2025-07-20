import { createCompiler } from '@fumadocs/mdx-remote';
import type { LoadedConfig } from '@/utils/config';
import { remarkInclude } from '@/mdx-plugins/remark-include';
import {
  remarkStructure,
  type StructuredData,
} from 'fumadocs-core/mdx-plugins';
import { _runtime, createMDXSource } from '@/runtime/index';
import type { RuntimeAsync } from '@/runtime/types';

async function initCompiler(config: LoadedConfig, collection: string) {
  const col = config.collections.get(collection);

  switch (col?.type) {
    case 'doc':
      if (col.mdxOptions)
        return createCompiler({
          preset: 'minimal',
          ...col.mdxOptions,
        });
      break;
    case 'docs':
      if (col.docs.mdxOptions)
        return createCompiler({
          preset: 'minimal',
          ...col.docs.mdxOptions,
        });
      break;
  }

  let defaultMdxOptions = config.global?.mdxOptions;
  if (typeof defaultMdxOptions === 'function')
    defaultMdxOptions = await defaultMdxOptions();

  if (defaultMdxOptions?.preset === 'minimal') {
    return createCompiler(defaultMdxOptions);
  }

  const remarkPlugins = defaultMdxOptions?.remarkPlugins ?? [];
  return createCompiler({
    ...defaultMdxOptions,
    remarkPlugins: (v) =>
      typeof remarkPlugins === 'function'
        ? [remarkInclude, ...remarkPlugins(v), remarkStructure]
        : [remarkInclude, ...v, ...remarkPlugins, remarkStructure],
  });
}

export const _runtimeAsync: RuntimeAsync = {
  doc(files, collection, config) {
    const init = initCompiler(config, collection);

    return files.map(({ info: file, data, content, lastModified }) => {
      return {
        ...data,
        _file: file,
        content,
        async load() {
          const compiler = await init;
          const out = await compiler.compile({
            source: content,
            filePath: file.absolutePath,
          });

          return {
            body: out.body,
            toc: out.toc,
            lastModified,
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
