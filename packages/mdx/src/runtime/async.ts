import { type CollectionEntry, type FileInfo } from '@/config/types';
import { createCompiler, type MDXOptions } from '@fumadocs/mdx-remote';
import * as fs from 'node:fs/promises';
import type { z } from 'zod';
import type { LoadedConfig } from '@/utils/load-config';
import { remarkInclude } from '@/mdx-plugins/remark-include';
import type { defineCollections } from '@/config/define';
import type { frontmatterSchema } from '@/utils/schema';

type T = ReturnType<
  typeof defineCollections<'doc', typeof frontmatterSchema, true>
>;

/**
 * @internal
 */
export function asyncFiles(
  files: {
    file: FileInfo;
    frontmatter: Record<string, unknown>;
  }[],
  collection: string,
  config: LoadedConfig,
): unknown[] {
  async function init() {
    const col = config.collections.get(collection);
    let mdxOptions: MDXOptions;

    if (col?.type === 'doc' && col.mdxOptions) {
      mdxOptions = col.mdxOptions as MDXOptions;
    } else {
      const options =
        typeof config.global?.mdxOptions === 'function'
          ? await config.global.mdxOptions()
          : config.global?.mdxOptions;
      const remarkPlugins = options?.remarkPlugins ?? [];

      mdxOptions = {
        ...options,
        remarkPlugins: (v) =>
          typeof remarkPlugins === 'function'
            ? [remarkInclude, ...remarkPlugins(v)]
            : [remarkInclude, ...v, ...remarkPlugins],
      };
    }

    return createCompiler(mdxOptions);
  }

  const initCompiler = init();

  return files.map(({ file, frontmatter }) => {
    return {
      ...(frontmatter as z.infer<typeof frontmatterSchema>),
      _file: file,
      async load() {
        const compiler = await initCompiler;
        const out = await compiler.compile({
          source: (await fs.readFile(file.absolutePath)).toString(),
          filePath: file.absolutePath,
        });

        return {
          body: out.body,
          toc: out.toc,
          structuredData: {
            headings: [],
            contents: [],
          },
          _exports: out.exports ?? {},
        };
      },
    } satisfies CollectionEntry<T>;
  });
}

export { buildConfig } from '@/config/build';
