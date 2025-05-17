import * as Plugins from 'fumadocs-core/mdx-plugins';
import { type CompileOptions, createProcessor } from '@mdx-js/mdx';
import type { MDXComponents } from 'mdx/types';
import { parseFrontmatter, pluginOption, type ResolvePlugins } from './utils';
import type { Compatible, VFile } from 'vfile';
import type { TableOfContents } from 'fumadocs-core/server';
import { executeMdx, type MdxContent } from '@/render';
import { pathToFileURL } from 'node:url';

export type MDXOptions = Omit<
  CompileOptions,
  'remarkPlugins' | 'rehypePlugins'
> & {
  remarkPlugins?: ResolvePlugins;
  rehypePlugins?: ResolvePlugins;

  remarkHeadingOptions?: Plugins.RemarkHeadingOptions | false;
  rehypeCodeOptions?: Plugins.RehypeCodeOptions | false;
  rehypeTocOptions?: Plugins.RehypeTocOptions | false;
  remarkCodeTabOptions?: Plugins.RemarkCodeTabOptions | false;

  /**
   * The directory to find image sizes
   *
   * @defaultValue './public'
   * @deprecated Use `remarkImageOptions.publicDir` instead
   */
  imageDir?: string;

  remarkImageOptions?: Plugins.RemarkImageOptions | false;
};

export interface CompileMDXOptions {
  source: string;
  /**
   * File path of source content
   */
  filePath?: string;

  mdxOptions?: MDXOptions;
  components?: MDXComponents;
  scope?: Record<string, unknown>;

  /**
   * @deprecated Use `compiler.compileFile` instead if you doesn't need to execute output JavaScript code.
   */
  skipRender?: boolean;
}

export interface CompileMDXResult<TFrontmatter = Record<string, unknown>> {
  body: MdxContent;
  frontmatter: TFrontmatter;
  toc: TableOfContents;
  vfile: VFile;

  compiled: string;
  exports: Record<string, unknown> | null;
}

export function createCompiler(mdxOptions?: MDXOptions) {
  let instance: ReturnType<typeof createProcessor> | undefined;

  function getProcessor() {
    if (instance) return instance;

    let format = mdxOptions?.format;
    if (!format || format === 'detect') format = 'mdx';

    return (instance = createProcessor({
      ...getCompileOptions(mdxOptions),
      format,
    }));
  }

  return {
    async render(
      compiled: string,
      scope?: Record<string, unknown>,
      filePath?: string,
    ) {
      return executeMdx(compiled, {
        scope,
        baseUrl: filePath ? pathToFileURL(filePath) : undefined,
        jsxRuntime: mdxOptions?.development
          ? await import('react/jsx-dev-runtime')
          : undefined,
      });
    },
    /**
     * Compile VFile
     */
    async compileFile(from: Compatible): Promise<VFile> {
      return getProcessor().process(from);
    },
    async compile<Frontmatter extends object = Record<string, unknown>>(
      options: Omit<CompileMDXOptions, 'mdxOptions'>,
    ): Promise<CompileMDXResult<Frontmatter>> {
      const { scope = {}, skipRender } = options;
      const { frontmatter, content } = parseFrontmatter(options.source);

      const file = await this.compileFile({
        value: content,
        path: options.filePath,
      });
      const compiled = String(file);
      const exports = !skipRender
        ? await this.render(compiled, scope, options.filePath)
        : null;

      return {
        vfile: file,
        compiled,
        frontmatter: frontmatter as Frontmatter,
        async body(props) {
          if (!exports)
            throw new Error(
              'Body cannot be rendered when `skipRender` is set to true',
            );

          return exports.default({
            components: { ...options.components, ...props.components },
          });
        },
        toc: exports?.toc ?? (file.data.toc as TableOfContents),
        exports,
      };
    },
  };
}

export async function compileMDX<
  Frontmatter extends object = Record<string, unknown>,
>(options: CompileMDXOptions): Promise<CompileMDXResult<Frontmatter>> {
  const compiler = createCompiler(options.mdxOptions);

  return compiler.compile(options);
}

function getCompileOptions({
  rehypeCodeOptions,
  remarkImageOptions,
  rehypeTocOptions,
  remarkHeadingOptions,
  remarkCodeTabOptions,
  imageDir = './public',
  ...options
}: MDXOptions = {}): CompileOptions {
  function getPlugin<K extends keyof typeof Plugins>(
    name: K,
  ): (typeof Plugins)[K] | null {
    return name in Plugins ? Plugins[name] : null;
  }
  const remarkGfm = getPlugin('remarkGfm');
  const remarkHeading = getPlugin('remarkHeading');
  const remarkCodeTab = getPlugin('remarkCodeTab');
  const remarkImage = getPlugin('remarkImage');
  const rehypeCode = getPlugin('rehypeCode');
  const rehypeToc = getPlugin('rehypeToc');

  return {
    ...options,
    outputFormat: 'function-body',
    remarkPlugins: pluginOption(
      (v) => [
        remarkGfm,
        remarkHeading && remarkHeadingOptions !== false
          ? [remarkHeading, remarkHeadingOptions]
          : null,
        remarkImage && remarkImageOptions !== false
          ? [
              remarkImage,
              {
                useImport: false,
                publicDir: imageDir,
                ...remarkImageOptions,
              } satisfies Plugins.RemarkImageOptions,
            ]
          : null,
        remarkCodeTab && remarkCodeTabOptions !== false
          ? [remarkCodeTab, remarkCodeTabOptions]
          : null,
        ...v,
      ],
      options.remarkPlugins,
    ),
    rehypePlugins: pluginOption(
      (v) => [
        rehypeCode && rehypeCodeOptions !== false
          ? [rehypeCode, rehypeCodeOptions]
          : null,
        rehypeToc && rehypeTocOptions !== false
          ? [rehypeToc, rehypeTocOptions]
          : null,
        ...v,
      ],
      options.rehypePlugins,
    ),
  };
}
