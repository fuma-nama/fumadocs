import type { ProcessorOptions } from '@mdx-js/mdx';
import type * as Plugins from '@/mdx-plugins';
import { resolvePlugins, type ResolvePlugins } from '@/content/mdx/util';

export type MDXBundlerPresetOptions = Omit<
  NonNullable<ProcessorOptions>,
  'rehypePlugins' | 'remarkPlugins'
> & {
  rehypePlugins?: ResolvePlugins;
  remarkPlugins?: ResolvePlugins;

  remarkStructureOptions?: Plugins.StructureOptions | false;
  remarkHeadingOptions?: Plugins.RemarkHeadingOptions;
  remarkImageOptions?: Plugins.RemarkImageOptions | false;
  remarkCodeTabOptions?: Plugins.RemarkCodeTabOptions | false;
  remarkNpmOptions?: Plugins.RemarkNpmOptions | false;
  rehypeCodeOptions?: Plugins.RehypeCodeOptions | false;
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
    ...mdxOptions
  } = options;

  const remarkPlugins = await resolvePlugins(
    (v) => [
      import('remark-gfm').then((mod) => mod.default),
      import('@/mdx-plugins/remark-heading').then((mod) => [
        mod.remarkHeading,
        {
          generateToc: false,
          ...remarkHeadingOptions,
        },
      ]),
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
      import('@/mdx-plugins/rehype-toc').then((mod) => mod.rehypeToc),
    ],
    mdxOptions.rehypePlugins,
  );

  return {
    ...mdxOptions,
    remarkPlugins,
    rehypePlugins,
  };
}
