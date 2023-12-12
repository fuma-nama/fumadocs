import {
  createPageTreeBuilder,
  type PageTreeBuilder,
} from 'next-docs-zeta/server';
import type { ReactElement } from 'react';
import type { ResolvedFiles } from './resolve-files';
import type { DefaultFrontmatter, DefaultMetaData } from './types';

export interface BuilderOptions {
  resolveIcon?: (icon: string) => ReactElement | undefined;
}

export function getPageTreeBuilder(
  { metas, pages }: ResolvedFiles<DefaultFrontmatter, DefaultMetaData>,
  { resolveIcon = () => undefined }: BuilderOptions,
): PageTreeBuilder {
  return createPageTreeBuilder({
    metas: metas.map((meta) => ({
      file: meta.file,
      pages: meta.data.pages,
      icon: meta.data.icon,
      title: meta.data.title,
    })),
    pages: pages.map((page) => ({
      file: page.file,
      title: page.matter.title,
      url: page.url,
      icon: page.matter.icon,
    })),
    resolveIcon,
  });
}
