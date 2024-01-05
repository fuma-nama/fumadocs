import type { RawDocumentData } from 'contentlayer/source-files';
import type { MDX } from 'contentlayer/core';

export interface MetaPageBase {
  _id: string;
  _raw: RawDocumentData;
  type: 'Meta';
  title?: string | undefined;
  pages?: string[];
  icon?: string;
  root?: boolean;
}

export interface DocsPageBase {
  _id: string;
  _raw: RawDocumentData;
  type: 'Docs';
  title: string;
  description?: string | undefined;
  icon?: string;
  body: MDX;
}
