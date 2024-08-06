import { map } from '@/.map';
import { createMDXSource, defaultSchemas } from 'fumadocs-mdx';
import { loader } from 'fumadocs-core/source';
import { attachFile } from 'fumadocs-openapi/source';
import { z } from 'zod';

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
