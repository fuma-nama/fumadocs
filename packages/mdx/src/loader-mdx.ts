import path from 'node:path';
import { createProcessor, type ProcessorOptions } from '@mdx-js/mdx';
import { type Processor } from '@mdx-js/mdx/internal-create-format-aware-processors';
import grayMatter from 'gray-matter';
import { type NormalModule, type LoaderContext } from 'webpack';
import type { Pluggable } from 'unified';
import {
  rehypeCode,
  type RehypeCodeOptions,
  remarkGfm,
  remarkHeading,
  type RemarkHeadingOptions,
  remarkImage,
  type RemarkImageOptions,
  remarkStructure,
} from 'fumadocs-core/mdx-plugins';
import remarkMdxExport from '@/mdx-plugins/remark-exports';
import { getPlugins } from '@/utils/resolve-plugins';
import { getGitTimestamp } from './utils/git-timestamp';

export type ResolvePlugins = Pluggable[] | ((v: Pluggable[]) => Pluggable[]);

/**
 * A delayed plugin resolution, which dynamically imports the named plugin,
 * and then passes the options to it.
 */
export type LazyPluginResolution = [string, object];

/**
 * A plugin can either be a valid Unified plugin or a pair of plugin name and options
 */
export type ResolvePluginsInput = ResolvePlugins | LazyPluginResolution[];

export type MDXOptions = ProcessorOptions & {
  /**
   * Fetch last modified time with specified version control
   * @defaultValue 'none'
   */
  lastModifiedTime?: 'git' | 'none';

  /**
   * The folder from which to import the MDX components
   */
  providerImportSource?: string | null;

  /**
   * Properties to export from `vfile.data`
   */
  valueToExport?: string[];

  remarkHeadingOptions?: RemarkHeadingOptions;
  remarkImageOptions?: RemarkImageOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
};

export type InputMDXOptions = Omit<
  MDXOptions,
  'remarkPlugins' | 'rehypePlugins'
> & {
  rehypePlugins?: ResolvePluginsInput;
  remarkPlugins?: ResolvePluginsInput;
};

export interface InternalBuildInfo {
  __fumadocs?: {
    path: string;
    /**
     * `vfile.data` parsed from file
     */
    data: unknown;
  };
}

async function getMDXLoaderOptions({
  valueToExport = [],
  rehypeCodeOptions,
  remarkImageOptions,
  remarkHeadingOptions,
  ...mdxOptions
}: InputMDXOptions): Promise<MDXOptions> {
  const mdxExports = [
    'structuredData',
    'toc',
    'frontmatter',
    'lastModified',
    ...valueToExport,
  ];

  const remarkPlugins = await getPlugins(
    (v) => [
      remarkGfm,
      [remarkHeading, remarkHeadingOptions],
      remarkImageOptions !== false && [remarkImage, remarkImageOptions],
      ...v,
      remarkStructure,
      [remarkMdxExport, { values: mdxExports }],
    ],
    mdxOptions.remarkPlugins ?? [],
  );

  const rehypePlugins = await getPlugins(
    (v) => [
      rehypeCodeOptions !== false && [rehypeCode, rehypeCodeOptions],
      ...v,
    ],
    mdxOptions.rehypePlugins ?? [],
  );

  return {
    providerImportSource: 'next-mdx-import-source-file',
    ...mdxOptions,
    remarkPlugins,
    rehypePlugins,
  };
}

const cache = new Map<string, Processor>();

/**
 * Load MDX/markdown files
 *
 * it supports frontmatter by parsing and injecting the data in `vfile.data.frontmatter`
 */
export default async function loader(
  this: LoaderContext<InputMDXOptions>,
  source: string,
  callback: LoaderContext<InputMDXOptions>['callback'],
): Promise<void> {
  this.cacheable(true);
  const context = this.context;
  const filePath = this.resourcePath;
  const { lastModifiedTime, ...options } = await getMDXLoaderOptions(
    this.getOptions(),
  );

  const { content, data: frontmatter } = grayMatter(source);
  const detectedFormat = filePath.endsWith('.mdx') ? 'mdx' : 'md';
  const format = options.format ?? detectedFormat;
  let timestamp: number | undefined;
  let processor = cache.get(format);

  if (processor === undefined) {
    processor = createProcessor({
      ...options,
      development: this.mode === 'development',
      format,
    });

    cache.set(format, processor);
  }

  if (lastModifiedTime === 'git')
    timestamp = (await getGitTimestamp(filePath))?.getTime();

  processor
    .process({
      value: content,
      path: filePath,
      data: {
        lastModified: timestamp,
        frontmatter,
      },
    })
    .then(
      (file) => {
        const module =
          this._module ?? (this._module = { buildInfo: {} } as NormalModule);
        const buildInfo = module.buildInfo ?? (module.buildInfo = {});

        buildInfo.__fumadocs = {
          path: filePath,
          data: file.data,
        };

        callback(undefined, String(file.value), file.map ?? undefined);
      },
      (error: Error) => {
        const fpath = path.relative(context, filePath);
        error.message = `${fpath}:${error.name}: ${error.message}`;
        callback(error);
      },
    );
}
