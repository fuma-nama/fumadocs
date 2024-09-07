import { createMDXSource } from 'fumadocs-mdx';
import { loader } from 'fumadocs-core/dist/source';
import { attachFile, createOpenAPI } from 'fumadocs-openapi/dist/server';
import { docs, meta } from '@/.source';

export const source = loader({
  baseUrl: '/docs',
  source: createMDXSource(docs, meta),
  pageTree: {
    attachFile,
  },
});

export const openapi = createOpenAPI();
