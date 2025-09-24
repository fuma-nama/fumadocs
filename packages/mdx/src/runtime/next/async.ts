import type { LoadedConfig } from '@/loaders/config';
import { _runtime, createMDXSource } from './index';
import type { AsyncDocOut, RuntimeAsync } from './types';
import { buildMDX, CompiledMDXProperties } from '@/loaders/mdx/build-mdx';
import type { ProcessorOptions } from '@mdx-js/mdx';
import { executeMdx } from '@fumadocs/mdx-remote/client';
import { pathToFileURL } from 'node:url';
import { type DocData, missingProcessedMarkdown } from '@/runtime/shared';
import type { DocCollection } from '@/config';
import { readFileWithCache } from '@/next/map/file-cache';
import { fumaMatter } from '@/utils/fuma-matter';

function getDocCollection(config: LoadedConfig, collection: string) {
  const col = config.collections.get(collection);
  if (col?.type === 'doc' && col.mdxOptions) return col;
  if (col?.type === 'docs' && col.docs.mdxOptions) return col.docs;
}

async function getOptions(
  config: LoadedConfig,
  collection?: DocCollection,
): Promise<ProcessorOptions> {
  return (
    collection?.mdxOptions ?? (await config.getDefaultMDXOptions('remote'))
  );
}

export const _runtimeAsync: RuntimeAsync = {
  doc(files, collectionName, config) {
    const collection = getDocCollection(config, collectionName);
    const initMdxOptions = getOptions(config, collection);

    return files.map(({ info, data, lastModified }) => {
      let cachedResult: CompiledMDXProperties | undefined;

      async function compileAndLoad() {
        if (cachedResult) return cachedResult;
        const mdxOptions = await initMdxOptions;
        const raw = await readFileWithCache(info.fullPath);
        const { content } = fumaMatter(raw);
        const compiled = await buildMDX(collectionName, content, {
          ...mdxOptions,
          development: false,
          frontmatter: data,
          postprocess: collection?.postprocess,
          data: {
            lastModified,
          },
          filePath: info.fullPath,
        });
        const result = await executeMdx(String(compiled.value), {
          baseUrl: pathToFileURL(info.fullPath),
        });

        return (cachedResult = result as CompiledMDXProperties);
      }

      return {
        ...data,
        info,
        async getText(type) {
          if (type === 'raw') {
            return readFileWithCache(info.fullPath);
          }

          const out = await compileAndLoad();
          if (typeof out._markdown !== 'string') missingProcessedMarkdown();
          return out._markdown;
        },
        async load() {
          const out = await compileAndLoad();

          return {
            _exports: out as unknown as Record<string, unknown>,
            body: out.default,
            lastModified,
            toc: out.toc,
            extractedReferences: out.extractedReferences,
            structuredData: out.structuredData,
          } satisfies DocData;
        },
      } satisfies AsyncDocOut;
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
