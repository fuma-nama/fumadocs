import {
  createGetUrl,
  type BuildPageTreeOptions,
  type PageTree,
} from 'next-docs-zeta/server';
import { getPageTreeBuilder, type BuilderOptions } from './build-tree';
import { createPageUtils, type PageUtils } from './page-utils';
import {
  defaultValidators,
  resolveFiles,
  type ResolveOptions,
} from './resolve-files';
import type { Meta, Page } from './types';

type UtilsOptions<Langs extends string[] | undefined> = {
  languages: Langs;

  /**
   * @defaultValue `'/'`
   */
  baseUrl: string;

  pageTreeOptions: BuildPageTreeOptions;
} & BuilderOptions &
  Pick<ResolveOptions, 'getSlugs' | 'getUrl' | 'validate' | 'rootDir'>;

export type Utils = PageUtils & {
  tree: PageTree;
  pages: Page[];
  metas: Meta[];
};

type I18nUtils = Omit<Utils, 'tree'> & {
  tree: Record<string, PageTree>;
};

function fromMap<Langs extends string[] | undefined = undefined>(
  map: Record<string, unknown>,
  {
    baseUrl = '/',
    rootDir = '',
    getSlugs,
    getUrl = createGetUrl(baseUrl),
    resolveIcon,
    pageTreeOptions = { root: '' },
    languages,
    validate,
  }: Partial<UtilsOptions<Langs>> = {},
): Langs extends string[] ? I18nUtils : Utils {
  const resolved = resolveFiles({
    map,
    rootDir,
    getSlugs,
    getUrl,
    validate,
  });

  const pageUtils = createPageUtils(resolved, languages ?? []);

  const builder = getPageTreeBuilder(resolved, {
    resolveIcon,
  });

  const tree =
    languages === undefined
      ? builder.build(pageTreeOptions)
      : builder.buildI18n({
          ...pageTreeOptions,
          languages,
        });

  return {
    ...resolved,
    ...pageUtils,
    tree,
  } as Langs extends string[] ? I18nUtils : Utils;
}

export {
  fromMap,
  resolveFiles,
  createPageUtils,
  getPageTreeBuilder,
  defaultValidators,
};
