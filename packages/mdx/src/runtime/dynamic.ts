import { buildConfig, type DocCollectionItem } from '@/config/build';
import { buildMDX, type CompiledMDXProperties } from '@/loaders/mdx/build-mdx';
import { executeMdx } from '@fumadocs/mdx-remote/client';
import { pathToFileURL } from 'node:url';
import { fumaMatter } from '@/utils/fuma-matter';
import fs from 'node:fs/promises';
import { server, type ServerOptions } from './server';
import { type CoreOptions, createCore } from '@/core';
import type { FileInfo, InternalTypeConfig } from './types';

export interface LazyEntry<Data = unknown> {
  info: FileInfo;
  data: Data;

  hash?: string;
}

export type CreateDynamic<
  Config,
  TC extends InternalTypeConfig = InternalTypeConfig,
> = ReturnType<typeof dynamic<Config, TC>>;

export async function dynamic<Config, TC extends InternalTypeConfig>(
  configExports: Config,
  coreOptions: CoreOptions,
  serverOptions?: ServerOptions,
) {
  const core = createCore(coreOptions);
  await core.init({
    config: buildConfig(configExports as Record<string, unknown>),
  });

  const create = server<Config, TC>(serverOptions);

  function getDocCollection(name: string): DocCollectionItem | undefined {
    const collection = core.getCollection(name);
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

    async function compile({ info, data }: LazyEntry<unknown>) {
      let content = (await fs.readFile(info.fullPath)).toString();
      content = fumaMatter(content).content;

      const compiled = await buildMDX(core, collection, {
        filePath: info.fullPath,
        source: content,
        frontmatter: data as Record<string, unknown>,
        isDevelopment: false,
        environment: 'runtime',
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
    async doc<Name extends keyof Config & string>(
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
    async docs<Name extends keyof Config & string>(
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
