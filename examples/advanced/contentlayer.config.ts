import { makeSource } from 'contentlayer/source-files';
import { createConfig } from 'next-docs-zeta/contentlayer/configuration';
import { structure } from 'next-docs-zeta/mdx-plugins';

export default makeSource(
  createConfig({
    docsComputedFields: {
      structuredData: {
        type: 'json',
        resolve: (page) => structure(page.body.raw),
      },
    },
  }),
);
