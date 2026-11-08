import {
  PortableText,
  toPlainText,
  type PortableTextBlock,
  type PortableTextProps,
} from '@portabletext/react';
import type { Plugin } from 'fumadocs-core/framework/plugin';
import type { LoaderConfig, Page, PageData } from 'fumadocs-core/source';
import type { BaseDoc, DocToPage, DocToPageLoaded } from './index';

export interface SanityPluginOptions<P extends Page = Page> {
  /** the components of Portable Text for your block types, or a function returning those of a page */
  components?: PortableTextProps['components'] | ((page: P) => PortableTextProps['components']);
}

type SanityDoc = BaseDoc & { _createdAt?: string; body?: PortableTextBlock[] };

type SanityPageData = DocToPage<SanityDoc>;

function isSanityPageData(data: PageData): data is SanityPageData {
  return (
    '_id' in data &&
    typeof data._id === 'string' &&
    'load' in data &&
    typeof data.load === 'function'
  );
}

/**
 * Render the Portable Text `body` of documents from `createSanitySource()`, with their dates.
 */
export default function sanityPlugin<Config extends LoaderConfig = LoaderConfig>({
  components,
}: SanityPluginOptions<Config['page']> = {}): Plugin<Config> {
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
    async getPageBody(page) {
      const { data } = page;
      if (!isSanityPageData(data)) return;
      const { body = [] } = await load(data);
      return {
        node: (
          <PortableText
            value={body}
            components={typeof components === 'function' ? components(page) : components}
          />
        ),
      };
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
