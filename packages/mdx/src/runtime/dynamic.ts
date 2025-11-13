import { buildConfig, type DocCollectionItem } from '@/config/build';
import { buildMDX, type CompiledMDXProperties } from '@/loaders/mdx/build-mdx';
import { executeMdx } from '@fumadocs/mdx-remote/client';
import { pathToFileURL } from 'node:url';
import { fumaMatter } from '@/utils/fuma-matter';
import fs from 'node:fs/promises';
import { type FileInfo, fromConfig } from './server';

export interface LazyEntry<Data> {
  info: FileInfo;
  data: Data;
  lastModified?: Date;
  hash?: string;
}

export type CreateDynamic<Config> = ReturnType<
  typeof fromConfigDynamic<Config>
>;

export function fromConfigDynamic<Config>(configExports: Config) {
  const config = buildConfig(configExports as Record<string, unknown>);
  const create = fromConfig<Config>();

  function getDocCollection(name: string): DocCollectionItem | undefined {
    const collection = config.getCollection(name);
    if (!collection) return;

    if (collection.type === 'docs') return collection.docs;
    else if (collection.type === 'doc') return collection;
  }

  function convertLazyEntries(
    collection: DocCollectionItem,
    entries: LazyEntry<unknown>[],
  ) {
    const head: Record<string, () => unknown> = {};
    const body: Record<string, () => Promise<unknown>> = {};

    async function compile({ info, lastModified, data }: LazyEntry<unknown>) {
      const mdxOptions = await config.getMDXOptions(collection, 'runtime');
      const raw = (await fs.readFile(info.fullPath)).toString();

      const { content } = fumaMatter(raw);
      const compiled = await buildMDX(collection.name, content, {
        ...mdxOptions,
        development: false,
        frontmatter: data as Record<string, unknown>,
        postprocess: collection!.postprocess,
        data: {
          lastModified,
        },
        filePath: info.fullPath,
      });

      return (await executeMdx(String(compiled.value), {
        baseUrl: pathToFileURL(info.fullPath),
      })) as CompiledMDXProperties;
    }

    for (const entry of entries) {
      head[entry.info.path] = () => entry.data;
      let cachedResult: Promise<CompiledMDXProperties> | undefined;
      body[entry.info.path] = () => (cachedResult ??= compile(entry));
    }

    return { head, body };
  }

  return {
    async doc<Name extends keyof Config>(
      name: Name,
      base: string,
      entries: LazyEntry<unknown>[],
    ) {
      const collection = getDocCollection(name as string);
      if (!collection)
        throw new Error(`the doc collection ${name as string} doesn't exist.`);

      const { head, body } = convertLazyEntries(collection, entries);

      return create.docLazy(name, base, head, body);
    },
    async docs<Name extends keyof Config>(
      name: Name,
      base: string,
      meta: Record<string, unknown>,
      entries: LazyEntry<unknown>[],
    ) {
      const collection = getDocCollection(name as string);
      if (!collection)
        throw new Error(`the doc collection ${name as string} doesn't exist.`);

      const docs = convertLazyEntries(collection, entries);
      return create.docsLazy(name, base, meta, docs.head, docs.body);
    },
  };
}
