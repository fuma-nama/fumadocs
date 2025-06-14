import * as path from 'node:path';
import { parse } from 'node:querystring';
import { type LoaderContext } from 'webpack';
import { getConfigHash, loadConfig, type LoadedConfig } from '@/utils/config';
import { buildMDX } from '@/utils/build-mdx';
import { getGitTimestamp } from './utils/git-timestamp';
import { validate, ValidationError } from '@/utils/schema';
import { fumaMatter } from '@/utils/fuma-matter';

export interface Options {
  configPath: string;
  outDir: string;
}

/**
 * Load MDX/markdown files
 *
 * it supports frontmatter by parsing and injecting the data in `vfile.data.frontmatter`
 */
export default async function loader(
  this: LoaderContext<Options>,
  source: string,
  callback: LoaderContext<Options>['callback'],
): Promise<void> {
  this.cacheable(true);
  const context = this.context;
  const filePath = this.resourcePath;
  const { configPath, outDir } = this.getOptions();
  const matter = fumaMatter(source);

  // notice that `resourceQuery` can be missing (e.g. `page.mdx`)
  const {
    hash: configHash = await getConfigHash(configPath),
    collection: collectionId,
  } = parse(this.resourceQuery.slice(1)) as {
    hash?: string;
    collection?: string;
  };
  const config = await loadConfig(configPath, outDir, configHash);

  let collection =
    collectionId !== undefined
      ? config.collections.get(collectionId)
      : undefined;

  if (collection && collection.type === 'docs') collection = collection.docs;
  if (collection && collection.type !== 'doc') {
    collection = undefined;
  }

  let data = matter.data;
  const mdxOptions =
    collection?.mdxOptions ?? (await loadDefaultOptions(config));

  if (collection?.schema) {
    try {
      data = await validate(
        collection.schema,
        matter.data,
        {
          source,
          path: filePath,
        },
        `invalid frontmatter in ${filePath}`,
      );
    } catch (e) {
      if (e instanceof ValidationError) {
        return callback(new Error(e.toStringFormatted()));
      }

      return callback(e as Error);
    }
  }

  let timestamp: number | undefined;
  if (config.global?.lastModifiedTime === 'git') {
    timestamp = (await getGitTimestamp(filePath))?.getTime();
  }

  try {
    // ensure the line number is correct in dev mode
    const lineOffset = '\n'.repeat(
      this.mode === 'development' ? lines(matter.matter) : 0,
    );

    const file = await buildMDX(
      `${configHash}:${collectionId ?? 'global'}`,
      lineOffset + matter.content,
      {
        development: this.mode === 'development',
        ...mdxOptions,
        filePath,
        frontmatter: data as Record<string, unknown>,
        data: {
          lastModified: timestamp,
        },
        _compiler: this,
      },
    );

    callback(undefined, String(file.value), file.map ?? undefined);
  } catch (error) {
    if (!(error instanceof Error)) throw error;

    const fpath = path.relative(context, filePath);
    error.message = `${fpath}:${error.name}: ${error.message}`;
    callback(error);
  }
}

async function loadDefaultOptions(config: LoadedConfig) {
  const input = config.global?.mdxOptions;
  config._mdx_loader ??= {};

  const mdxLoader = config._mdx_loader;
  if (!mdxLoader.cachedOptions) {
    const { getDefaultMDXOptions } = await import('@/utils/mdx-options');
    mdxLoader.cachedOptions =
      typeof input === 'function'
        ? getDefaultMDXOptions(await input())
        : getDefaultMDXOptions(input ?? {});
  }

  return mdxLoader.cachedOptions;
}

function lines(s: string) {
  let num = 0;

  for (const c of s) {
    if (c === '\n') num++;
  }

  return num;
}
