import {
  PortableText,
  toPlainText,
  type PortableTextBlock,
  type PortableTextProps,
} from '@portabletext/react';
import type { Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import type { BaseDoc, DocToPage, DocToPageLoaded } from './index';

export interface SanityPluginOptions extends Pick<PortableTextProps, 'components'> {
  /** only render documents of this `_type`, like the `docType` of `createSanitySource()` */
  docType?: BaseDoc['_type'];
}

type SanityDoc = BaseDoc & { _createdAt?: string; body?: PortableTextBlock[] };

type SanityPageData = DocToPage<SanityDoc>;

/**
 * Render the Portable Text `body` of documents from `createSanitySource()`, with their dates.
 */
export function sanityPlugin({ components, docType }: SanityPluginOptions = {}): Plugin {
  function isSanityPageData(data: PageData): data is SanityPageData {
    return (
      '_id' in data &&
      typeof data._id === 'string' &&
      (docType === undefined || ('_type' in data && data._type === docType)) &&
      'load' in data &&
      typeof data.load === 'function'
    );
  }

  // the source creates new page data when the `_updatedAt` of a document changes, so a document loaded per page data stays fresh
  const loaded = new WeakMap<SanityPageData, Promise<DocToPageLoaded<SanityDoc>>>();
  function load(data: SanityPageData) {
    let doc = loaded.get(data);
    if (!doc) {
      loaded.set(data, (doc = data.load()));
      doc.catch(() => loaded.delete(data));
    }
    return doc;
  }

  return {
    name: 'sanity',
    async getPageBody({ data }) {
      if (!isSanityPageData(data)) return;
      const { body = [] } = await load(data);
      return { node: <PortableText value={body} components={components} /> };
    },
    async getPageText({ data }) {
      if (isSanityPageData(data)) return toPlainText((await load(data)).body ?? []);
    },
    async getPageToc({ data }) {
      // plain text titles stay serializable for client components
      if (isSanityPageData(data)) return (await load(data)).renderToc({ render: toPlainText });
    },
    getPageStructuredData({ data }) {
      if (isSanityPageData(data)) return data.structuredData();
    },
    async getPageCreatedAt({ data }) {
      if (!isSanityPageData(data)) return;
      const { _createdAt } = await load(data);
      if (_createdAt) return new Date(_createdAt);
    },
    getPageLastModified({ data }) {
      if (isSanityPageData(data) && data._updatedAt) return new Date(data._updatedAt);
    },
  };
}
