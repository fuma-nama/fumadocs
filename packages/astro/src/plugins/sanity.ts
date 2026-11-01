import type { BaseDoc, DocToPage } from '@fumadocs/sanity';
import {
  PortableText,
  toPlainText,
  type PortableTextBlock,
  type PortableTextProps,
} from '@portabletext/react';
import { createElement } from 'react';
import type { AnyPage, Plugin } from '../app';
import { loadOnce } from '../shared';

export interface SanityPluginOptions {
  /** the components of Portable Text, for your block types */
  components?: PortableTextProps['components'];
}

type SanityPage = DocToPage<BaseDoc & { body?: PortableTextBlock[] }>;

function getData(page: AnyPage): SanityPage | undefined {
  const data = page.data as Partial<SanityPage>;
  if (
    typeof data._id === 'string' &&
    typeof data._type === 'string' &&
    typeof data.load === 'function'
  )
    return data as SanityPage;
}

/**
 * Render the Portable Text `body` of documents from `@fumadocs/sanity`, with their last updated dates.
 */
export function sanityPlugin({ components }: SanityPluginOptions = {}): Plugin {
  return {
    name: 'sanity',
    async getBody(page) {
      const data = getData(page);
      if (!data) return;
      const doc = await loadOnce(data);
      return {
        node: createElement(PortableText, { value: doc.body ?? [], components }),
        toc: doc.renderToc({ render: (block) => toPlainText(block) }),
      };
    },
    async getText(page) {
      const data = getData(page);
      if (data) return toPlainText((await loadOnce(data)).body ?? []);
    },
    transformPage(page, data) {
      const updatedAt = getData(page)?._updatedAt;
      return updatedAt ? { ...data, lastModified: new Date(updatedAt) } : data;
    },
  };
}
