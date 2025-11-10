import type { LoadedConfig } from '@/config/build';
import { buildMDX, type CompiledMDXProperties } from '@/loaders/mdx/build-mdx';
import { executeMdx } from '@fumadocs/mdx-remote/client';
import { pathToFileURL } from 'node:url';
import { fumaMatter } from '@/utils/fuma-matter';
import fs from 'node:fs/promises';
import { type FileInfo, fromConfig } from './server';
import type { DocCollection } from '@/config';

export interface LazyEntry<Data> {
  info: FileInfo;
  data: Data;
  lastModified?: Date;
}

export function fromConfigDynamic<Config>(config: LoadedConfig) {
  const create = fromConfig<Config>();
  function getDocCollection(name: string): DocCollection | undefined {
    const collection = config.getCollection(name);
    if (!collection) return;

    if (collection.type === 'docs') return collection.docs;
    else if (collection.type === 'doc') return collection;
  }

  return {
    async doc<Name extends keyof Config>(
      _name: Name,
      base: string,
      entries: LazyEntry<unknown>[],
    ) {
      const name = _name as string;
      const collection = getDocCollection(name);
      if (!collection) return [];

      const initMdxOptions =
        collection.mdxOptions ?? config.getDefaultMDXOptions('remote');

      const head: Record<string, () => unknown> = {};
      const body: Record<string, () => Promise<unknown>> = {};

      function fromEntry({
        info,
        data,
        lastModified,
      }: LazyEntry<unknown>): () => Promise<unknown> {
        let cachedResult: CompiledMDXProperties | undefined;

        return async () => {
          if (cachedResult) return cachedResult;
          const mdxOptions = await initMdxOptions;
          const raw = (await fs.readFile(info.fullPath)).toString();

          const { content } = fumaMatter(raw);
          const compiled = await buildMDX(name, content, {
            ...mdxOptions,
            development: false,
            frontmatter: data as Record<string, unknown>,
            postprocess: collection!.postprocess,
            data: {
              lastModified,
            },
            filePath: info.fullPath,
          });
          const result = await executeMdx(String(compiled.value), {
            baseUrl: pathToFileURL(info.fullPath),
          });

          return (cachedResult = result as CompiledMDXProperties);
        };
      }

      for (const entry of entries) {
        head[entry.info.path] = () => entry.data;
        body[entry.info.path] = fromEntry(entry);
      }

      create.docLazy(_name, base, head, body);
    },
  };
}

export { buildConfig } from '@/config/build';
