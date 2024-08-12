import { createMDXSource, defaultSchemas } from 'fumadocs-mdx';
import { z } from 'zod';
import type { InferMetaType, InferPageType } from 'fumadocs-core/source';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';
import { attachFile, createOpenAPI } from 'fumadocs-openapi/server';
import { map } from '@/.map';
import { create } from '@/components/ui/icon';

const frontmatter = defaultSchemas.frontmatter.extend({
  preview: z.string().optional(),
  index: z.boolean().default(false),
  /**
   * API routes only
   */
  method: z.string().optional(),
});

export const utils = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  icon(icon) {
    if (icon && icon in icons)
      return create({ icon: icons[icon as keyof typeof icons] });
  },
  source: createMDXSource(map, {
    schema: {
      frontmatter,
    },
  }),
  pageTree: {
    attachFile,
  },
});

export const blog = loader({
  baseUrl: '/blog',
  rootDir: 'blog',
  source: createMDXSource(map, {
    schema: {
      frontmatter: defaultSchemas.frontmatter.extend({
        author: z.string(),
        date: z.string().date().or(z.date()).optional(),
      }),
    },
  }),
});

export const openapi = createOpenAPI({});

export type Page = InferPageType<typeof utils>;
export type Meta = InferMetaType<typeof utils>;
