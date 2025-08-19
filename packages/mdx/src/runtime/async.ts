import type { LoadedConfig } from '@/utils/config';
import { type StructuredData } from 'fumadocs-core/mdx-plugins';
import { _runtime, createMDXSource } from '@/runtime/index';
import type { RuntimeAsync } from '@/runtime/types';
import { buildMDX } from '@/utils/build-mdx';
import type { ProcessorOptions } from '@mdx-js/mdx';
import { executeMdx } from '@fumadocs/mdx-remote/client';
import { pathToFileURL } from 'node:url';

async function getOptions(
  config: LoadedConfig,
  collection: string,
): Promise<ProcessorOptions> {
  const col = config.collections.get(collection);
  if (col?.type === 'doc' && col.mdxOptions) return col.mdxOptions;
  if (col?.type === 'docs' && col.docs.mdxOptions) return col.docs.mdxOptions;

  return config.getDefaultMDXOptions('remote');
}

export const _runtimeAsync: RuntimeAsync = {
  doc(files, collection, config) {
    const initMdxOptions = getOptions(config, collection);

    return files.map(({ info: file, data, content, lastModified }) => {
      return {
        ...data,
        _file: file,
        get content() {
          return `${content.matter}${content.body}`;
        },
        async load() {
          const mdxOptions = await initMdxOptions;
          const out = await buildMDX(collection, content.body, {
            ...mdxOptions,
            development: false,
            frontmatter: data as Record<string, unknown>,
            data: {
              lastModified,
            },
            filePath: file.absolutePath,
          });
          const executed = await executeMdx(String(out), {
            baseUrl: pathToFileURL(file.absolutePath),
          });

          return {
            body: executed.default,
            toc: executed.toc,
            lastModified,
            structuredData: out.data.structuredData as StructuredData,
            _exports: executed,
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
