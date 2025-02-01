import {
  type CollectionEntry,
  type DefaultMDXOptions,
  type defineCollections,
  type FileInfo,
  type frontmatterSchema,
  remarkInclude,
} from '@/config';
import { createCompiler } from '@fumadocs/mdx-remote';
import * as fs from 'node:fs/promises';
import type { z } from 'zod';

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
  mdxOptions: DefaultMDXOptions,
): unknown[] {
  const prevRemark = mdxOptions.remarkPlugins;

  const compiler = createCompiler({
    ...mdxOptions,
    remarkPlugins: (v) =>
      typeof prevRemark === 'function'
        ? [remarkInclude, ...prevRemark(v)]
        : [remarkInclude, ...v, ...(prevRemark ?? [])],
  });

  return files.map(({ file, frontmatter }) => {
    return {
      ...(frontmatter as z.infer<typeof frontmatterSchema>),
      _file: file,
      async load() {
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
          _exports: {},
        };
      },
    } satisfies CollectionEntry<T>;
  });
}
