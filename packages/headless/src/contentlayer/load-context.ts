import type { RawDocumentData } from 'contentlayer/source-files';
import type { ReactElement } from 'react';
import { createPageTreeBuilder } from '@/source/page-tree-builder';
import type { FileInfo } from '@/source/types';
import type { DocsPageBase, MetaPageBase, PagesContext } from './types';

export interface ContextOptions {
  languages: string[];

  resolveIcon: (icon: string) => ReactElement | undefined;
}

export function loadContext<Docs extends DocsPageBase>(
  metaPages: MetaPageBase[],
  docsPages: Docs[],
  {
    languages = [],
    resolveIcon = () => undefined,
  }: Partial<ContextOptions> = {},
): PagesContext<Docs> {
  const builder = createPageTreeBuilder({
    pages: docsPages.map((page) => ({
      file: getFileData(page._raw, page.locale),
      title: page.title,
      url: page.url,
      icon: page.icon,
    })),
    metas: metaPages.map((meta) => ({
      file: getFileData(meta._raw),
      pages: meta.pages,
      icon: meta.icon,
      title: meta.title,
    })),
    resolveIcon,
  });

  return {
    builder,
    i18nMap: getI18nPages(docsPages, languages),
  };
}

function getFileData(raw: RawDocumentData, locale?: string): FileInfo {
  const dotIndex = raw.sourceFileName.lastIndexOf('.');
  const flattenedPath =
    raw.sourceFileDir === raw.flattenedPath
      ? `${raw.flattenedPath}/index`
      : raw.flattenedPath;

  return {
    locale,
    dirname: raw.sourceFileDir,
    name: raw.sourceFileName.slice(0, dotIndex === -1 ? undefined : dotIndex),
    flattenedPath,
    path: raw.sourceFilePath,
  };
}

function getI18nPages<Docs extends DocsPageBase>(
  pages: Docs[],
  languages: string[],
): Map<string, Docs[]> {
  const pageMap = new Map<string, Docs>();

  for (const page of pages) {
    pageMap.set(getFileData(page._raw, page.locale).flattenedPath, page);
  }

  const langMap = new Map<string, Docs[]>();

  langMap.set('', []);
  for (const lang of languages) {
    langMap.set(lang, []);
  }

  for (const [key, page] of pageMap) {
    if (page.locale) continue;
    langMap.get('')?.push(page);

    for (const lang of languages) {
      const v = pageMap.get(`${key}.${lang}`) ?? page;

      langMap.get(lang)?.push(v);
    }
  }

  return langMap;
}
