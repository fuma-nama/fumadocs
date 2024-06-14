import path from 'node:path';
import type { NextConfig } from 'next';
import {
  rehypeCode,
  remarkGfm,
  remarkStructure,
  remarkHeading,
  type RehypeCodeOptions,
  remarkImage,
  type RemarkImageOptions,
  type RemarkHeadingOptions,
} from 'fumadocs-core/mdx-plugins';
import type { Pluggable } from 'unified';
import type { Configuration } from 'webpack';
import remarkMdxExport from './mdx-plugins/remark-exports';
import type { LoaderOptions } from './loader';
import type { MDXLoaderOptionsInput, MDXLoaderOptions } from './loader-mdx';
import {
  SearchIndexPlugin,
  type Options as SearchIndexPluginOptions,
} from './webpack-plugins/search-index-plugin';
import { RootMapFile } from './root-map-file';

type MDXOptions = Omit<
  NonNullable<MDXLoaderOptionsInput>,
  'rehypePlugins' | 'remarkPlugins'
> & {
  rehypePlugins?: ResolvePluginsInput;
  remarkPlugins?: ResolvePluginsInput;

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

/**
 * A delayed plugin resolution, which dynamically imports the named plugin,
 * and then passes the options to it.
 */
type LazyPluginResolution = [string, object];

/**
 * A plugin can either be a valid unified plugin or a pair of plugin name and options
 */
export type ResolvePluginsInput = ResolvePlugins | LazyPluginResolution[];

type ResolvePlugins = Pluggable[] | ((v: Pluggable[]) => Pluggable[]);

export interface CreateMDXOptions {
  cwd?: string;

  mdxOptions?: MDXLoaderOptionsInput;

  buildSearchIndex?:
    | Omit<SearchIndexPluginOptions, 'rootContentDir' | 'rootMapFile'>
    | boolean;

  /**
   * Where the root map.ts should be, relative to cwd
   *
   * @defaultValue `'./.map.ts'`
   */
  rootMapPath?: string;

  /**
   * Where the content directory should be, relative to cwd
   *
   * @defaultValue `'./content'`
   */
  rootContentPath?: string;

  /**
   * {@link LoaderOptions.include}
   */
  include?: string | string[];
}

function pluginOption(
  def: (v: Pluggable[]) => (Pluggable | false)[],
  options: ResolvePlugins = [],
): Pluggable[] {
  const list = def(Array.isArray(options) ? options : []).filter(
    Boolean,
  ) as Pluggable[];

  if (typeof options === 'function') {
    return options(list);
  }

  return list;
}

async function getMDXLoaderOptions({
  valueToExport = [],
  rehypeCodeOptions,
  remarkImageOptions,
  remarkHeadingOptions,
  ...mdxOptions
}: MDXOptions): Promise<MDXLoaderOptions> {
  const mdxExports = [
    'structuredData',
    'toc',
    'frontmatter',
    'lastModified',
    ...valueToExport,
  ];

  const remarkOptions = await resolveImportPlugins(
    mdxOptions.remarkPlugins ?? [],
  );
  const rehypeOptions = await resolveImportPlugins(
    mdxOptions.rehypePlugins ?? [],
  );

  const remarkPlugins = pluginOption(
    (v) => [
      remarkGfm,
      [remarkHeading, remarkHeadingOptions],
      remarkImageOptions !== false && [remarkImage, remarkImageOptions],
      ...v,
      remarkStructure,
      [remarkMdxExport, { values: mdxExports }],
    ],
    remarkOptions,
  );

  const rehypePlugins = pluginOption(
    (v) => [
      rehypeCodeOptions !== false && [rehypeCode, rehypeCodeOptions],
      ...v,
    ],
    rehypeOptions,
  );

  return {
    providerImportSource: 'next-mdx-import-source-file',
    ...mdxOptions,
    remarkPlugins,
    rehypePlugins,
  };
}

/**
 * When building with turbo we cannot pass closures across the nextjs → turbo boundary,
 * so instead we support the syntax from {@link LazyPluginResolution} which this function
 * then evaluates returning a fully resolved plugin
 */
async function resolveImportPlugins(
  input: ResolvePluginsInput,
): Promise<ResolvePlugins> {
  return Array.isArray(input)
    ? await Promise.all(
        input.map(async (v) => {
          if (isLazyPluginResolution(v)) {
            const [pluginName, options] = v;
            const plugin = (
              (await import(pluginName)) as {
                default: (options?: object) => Pluggable;
              }
            ).default;
            return (() => plugin(options)) as Pluggable;
          }
          return v;
        }),
      )
    : input;
}

function isLazyPluginResolution(
  v: LazyPluginResolution | Pluggable,
): v is LazyPluginResolution {
  return Array.isArray(v) && typeof v[0] === 'string';
}

const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];

function createMDX({
  mdxOptions = {},
  cwd = process.cwd(),
  rootMapPath = './.map.ts',
  rootContentPath = './content',
  buildSearchIndex = false,
  ...loadOptions
}: CreateMDXOptions = {}) {
  const rootMapFile = path.resolve(cwd, rootMapPath);
  const rootContentDir = path.resolve(cwd, rootContentPath);

  if (
    new RootMapFile({
      rootMapFile,
    }).create()
  ) {
    console.log(`Created ${rootMapFile} automatically for you.`);
  }

  return (nextConfig: NextConfig = {}): NextConfig => {
    return {
      ...nextConfig,
      pageExtensions: nextConfig.pageExtensions ?? defaultPageExtensions,
      experimental: {
        turbo: {
          rules: {
            '*.{md,mdx}': [
              {
                loader: 'fumadocs-mdx/loader-mdx',
                // TODO: how do we communicate to the user about this?
                // @ts-expect-error(arlyon): user must ensure only JSON is sent
                options: mdxOptions,
              },
            ],
            '.map.ts': [
              {
                loader: 'fumadocs-mdx/loader',
                options: {
                  rootContentDir,
                  rootMapFile,
                  ...loadOptions,
                },
              },
            ],
          },
        },
      },
      webpack: (config: Configuration, options) => {
        config.resolve ||= {};

        const alias = config.resolve.alias as Record<string, unknown>;

        alias['next-mdx-import-source-file'] = [
          'private-next-root-dir/src/mdx-components',
          'private-next-root-dir/mdx-components',
          '@mdx-js/react',
        ];

        config.module ||= {};
        config.module.rules ||= [];

        config.module.rules.push(
          {
            test: /\.mdx?$/,
            use: [
              options.defaultLoaders.babel,
              {
                loader: 'fumadocs-mdx/loader-mdx',
                options: mdxOptions,
              },
            ],
          },
          {
            test: rootMapFile,
            use: {
              loader: 'fumadocs-mdx/loader',
              options: {
                rootContentDir,
                rootMapFile,
                ...loadOptions,
              } satisfies LoaderOptions,
            },
          },
        );

        config.plugins ||= [];

        if (buildSearchIndex !== false)
          config.plugins.push(
            new SearchIndexPlugin({
              rootContentDir,
              rootMapFile,
              ...(typeof buildSearchIndex === 'object' ? buildSearchIndex : {}),
            }),
          );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- not provided
        return nextConfig.webpack?.(config, options) ?? config;
      },
    };
  };
}

export {
  createMDX as default,
  getMDXLoaderOptions,
};
