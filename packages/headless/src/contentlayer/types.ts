import type { RawDocumentData } from 'contentlayer/source-files';
import type { PageTreeBuilder } from '@/source/page-tree-builder';

export interface MetaPageBase {
  /** File path relative to `contentDirPath` */
  _id: string;
  _raw: RawDocumentData;
  type: 'Meta';
  /** The title of the folder */
  title?: string | undefined;
  /** Pages of the folder */
  pages: string[];
  icon?: string;
  slug: string;
}

export interface DocsPageBase {
  /** File path relative to `contentDirPath` */
  _id: string;
  _raw: RawDocumentData;
  type: 'Docs';
  /** The title of the document */
  title: string;
  /** The description of the document */
  description?: string | undefined;
  locale?: string;
  icon?: string;
  url: string;
  slug: string;
}

export interface PagesContext<Docs extends DocsPageBase = DocsPageBase> {
  builder: PageTreeBuilder;

  /**
   * Language to Page[]
   */
  i18nMap: Map<string, Docs[]>;
}
