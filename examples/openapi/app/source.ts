import { map } from '@/.map';
import { createMDXSource, defaultSchemas } from 'fumadocs-mdx';
import { loader } from 'fumadocs-core/source';
import { attachFile, createOpenAPI } from 'fumadocs-openapi/server';
import { z } from 'zod';
import * as path from 'node:path';

const frontmatter = defaultSchemas.frontmatter.extend({
  method: z.string().optional(),
});

export const { getPage, getPages, pageTree } = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createMDXSource(map, {
    schema: {
      frontmatter,
    },
  }),
  pageTree: {
    attachFile,
  },
});

export const openapi = createOpenAPI({
  documentOrPath: path.resolve('./unkey.json'),
});
