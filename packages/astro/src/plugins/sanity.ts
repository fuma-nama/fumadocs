import type { BaseDoc, DocToPage } from '@fumadocs/sanity';
import {
  PortableText,
  toPlainText,
  type PortableTextBlock,
  type PortableTextProps,
} from '@portabletext/react';
import type { PageData } from 'fumadocs-core/source';
import { createElement } from 'react';
import type { Plugin } from '../app';
import { loadOnce } from '../shared';

/** the components of Portable Text, for your block types */
export type SanityPluginOptions = Pick<PortableTextProps, 'components'>;

type SanityPageData = DocToPage<BaseDoc & { body?: PortableTextBlock[] }>;

function isSanityPageData(data: PageData): data is SanityPageData {
  const { _id, _type, load } = data as Partial<SanityPageData>;
  return typeof _id === 'string' && typeof _type === 'string' && typeof load === 'function';
}

/**
 * Render the Portable Text `body` of documents from `@fumadocs/sanity`, with their last updated dates.
 */
export function sanityPlugin({ components }: SanityPluginOptions = {}): Plugin {
  return {
    name: 'sanity',
    async getBody({ data }) {
      if (!isSanityPageData(data)) return;
      const doc = await loadOnce(data);
      return {
        node: createElement(PortableText, { value: doc.body ?? [], components }),
        toc: doc.renderToc({ render: (block) => toPlainText(block) }),
      };
    },
    async getText({ data }) {
      if (isSanityPageData(data)) return toPlainText((await loadOnce(data)).body ?? []);
    },
    transformPage(page, data) {
      if (!isSanityPageData(page.data) || !page.data._updatedAt) return data;
      return { ...data, lastModified: new Date(page.data._updatedAt) };
    },
  };
}
