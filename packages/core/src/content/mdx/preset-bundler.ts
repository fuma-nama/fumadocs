import type { ProcessorOptions } from '@mdx-js/mdx';
import type * as Plugins from '@/mdx-plugins';
import type { Analysis } from '@/mdx-plugins/stringifier';
import { resolvePlugins, type ResolvePlugins } from '@/content/mdx/util';
import type { Pluggable } from 'unified';

export type MDXBundlerPresetOptions = Omit<
  NonNullable<ProcessorOptions>,
  'rehypePlugins' | 'remarkPlugins'
> & {
  rehypePlugins?: ResolvePlugins;
  remarkPlugins?: ResolvePlugins;

  /** @private for `remark-include` */
  _include?: Pluggable;
  remarkStructureOptions?: Plugins.StructureOptions | false;
  remarkHeadingOptions?: Plugins.RemarkHeadingOptions | false;
  remarkImageOptions?: Plugins.RemarkImageOptions | false;
  remarkCodeTabOptions?: Plugins.RemarkCodeTabOptions | false;
  remarkNpmOptions?: Plugins.RemarkNpmOptions | false;
  rehypeCodeOptions?: Plugins.RehypeCodeOptions | false;
  /**
   * The analysis of the TOC, structured data and heading IDs, `runtime` makes the outputs functions of the props.
   *
   * @defaultValue 'static'
   */
  analysis?: Analysis;
};

/**
 * apply MDX processor presets
 */
export async function mdxPreset(options: MDXBundlerPresetOptions = {}): Promise<ProcessorOptions> {
  const {
    rehypeCodeOptions,
    remarkImageOptions,
    remarkHeadingOptions,
    remarkStructureOptions,
    remarkCodeTabOptions,
    remarkNpmOptions,
    analysis = 'static',
    _include,
    ...mdxOptions
  } = options;

  const remarkPlugins = await resolvePlugins(
    (v) => [
      import('remark-gfm').then((mod) => mod.default),
      remarkHeadingOptions !== false &&
        import('@/mdx-plugins/remark-heading').then((mod) => [
          mod.remarkHeading,
          {
            generateToc: false,
            analysis,
            ...remarkHeadingOptions,
          },
        ]),
      _include ?? false,
      remarkImageOptions !== false &&
        import('@/mdx-plugins/remark-image').then((mod) => [
          mod.remarkImage,
          {
            ...remarkImageOptions,
            useImport: remarkImageOptions?.useImport ?? true,
          },
        ]),
      remarkCodeTabOptions !== false &&
        import('@/mdx-plugins/remark-code-tab').then((mod) => [
          mod.remarkCodeTab,
          remarkCodeTabOptions,
        ]),
      remarkNpmOptions !== false &&
        import('@/mdx-plugins/remark-npm').then((mod) => [mod.remarkNpm, remarkNpmOptions]),
      ...v,
      remarkStructureOptions !== false &&
        import('@/mdx-plugins/remark-structure').then((mod) => [
          mod.remarkStructure,
          {
            exportAs: 'structuredData',
            analysis,
            ...remarkStructureOptions,
          } satisfies Plugins.StructureOptions,
        ]),
    ],
    mdxOptions.remarkPlugins,
  );

  const rehypePlugins = await resolvePlugins(
    (v) => [
      rehypeCodeOptions !== false &&
        import('@/mdx-plugins/rehype-code').then((mod) => [mod.rehypeCode, rehypeCodeOptions]),
      ...v,
      import('@/mdx-plugins/rehype-toc').then((mod) => [mod.rehypeToc, { analysis }]),
    ],
    mdxOptions.rehypePlugins,
  );

  return {
    ...mdxOptions,
    remarkPlugins,
    rehypePlugins,
  };
}
