import { createElement } from 'react';
import type { Adapter } from '@/lib/types';
import type { AsyncDocCollectionEntry, DocCollectionEntry } from 'fumadocs-mdx/runtime/server';
import defaultMdxComponents, { createRelativeLink } from 'fumadocs-ui/mdx';

export function fumadocsMdx(): Adapter {
  return {
    async 'core:get-llms-text'(page) {
      if (isAsyncEntry(page.data) || isSyncEntry(page.data)) {
        const processed: string = await page.data.getText('processed');

        return `# ${page.data.title} (${page.url})\n\n${processed}`;
      }
    },
    async 'core:get-structured-data'(page) {
      if (isSyncEntry(page.data)) return page.data.structuredData;
      if (isAsyncEntry(page.data)) {
        return (await page.data.load()).structuredData;
      }
    },
    async 'core:render-body'(page) {
      if (isSyncEntry(page.data)) {
        return createElement(page.data.body, {
          components: {
            ...defaultMdxComponents,
            a: createRelativeLink(await this.getLoader(), page),
          },
        });
      }

      if (isAsyncEntry(page.data)) {
        const { body } = await page.data.load();

        return createElement(body, {
          components: {
            ...defaultMdxComponents,
            a: createRelativeLink(await this.getLoader(), page),
          },
        });
      }
    },
    async 'core:render-toc'(page) {
      if (isSyncEntry(page.data)) return page.data.toc;
      if (isAsyncEntry(page.data)) return (await page.data.load()).toc;
    },
  };
}

function isSyncEntry(v: object): v is DocCollectionEntry {
  return (
    'info' in v && typeof v.info === 'object' && '_exports' in v && typeof v._exports === 'object'
  );
}

function isAsyncEntry(v: object): v is AsyncDocCollectionEntry {
  return 'info' in v && typeof v.info === 'object' && 'load' in v && typeof v.load === 'function';
}
