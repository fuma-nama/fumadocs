import type { BuildPageTreeOptions } from '@/source/page-tree-builder';
import type { PageTree } from '@/server/types';
import { loadContext, type ContextOptions } from './load-context';
import type { DocsPageBase, MetaPageBase, PagesContext } from './types';
import { createUtils, type ContentlayerUtils } from './utils';

type Options<L extends string[] | undefined> = Partial<
  Omit<ContextOptions, 'languages'> & {
    /**
     * @defaultValue `{ root: 'docs' }`
     */
    pageTreeOptions: BuildPageTreeOptions;
    languages: L;
  }
>;

type CreateContentlayer = <
  Meta extends MetaPageBase,
  Docs extends DocsPageBase,
  Langs extends string[] | undefined = undefined,
>(
  metaPages: Meta[],
  docsPages: Docs[],
  options?: Options<Langs>,
) => {
  __pageContext: PagesContext;
  tree: Langs extends string[] ? Record<string, PageTree> : PageTree;
} & ContentlayerUtils<Docs>;

/**
 * Create page tree and utilities for Contentlayer
 */
export const createContentlayer: CreateContentlayer = (
  metaPages,
  docsPages,
  options = {},
) => {
  const ctx = loadContext(metaPages, docsPages, options);
  const pageTreeOptions = options.pageTreeOptions ?? { root: 'docs' };
  const tree: ReturnType<CreateContentlayer>['tree'] =
    options.languages !== undefined
      ? ctx.builder.buildI18n({
          ...pageTreeOptions,
          languages: options.languages,
        })
      : ctx.builder.build(pageTreeOptions);

  return {
    __pageContext: ctx,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- Avoid complicated types
    tree: tree as any,
    ...createUtils(ctx),
  };
};
