import { createMDXSource, defaultSchemas } from 'fumadocs-mdx';
import { z } from 'zod';
import type { InferMetaType, InferPageType } from 'fumadocs-core/source';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';
import { map } from '@/.map';
import { create } from '@/components/ui/icon';
import { ApiIndicator } from '@/components/ui/api-indicator';

const frontmatter = defaultSchemas.frontmatter.extend({
  preview: z.string().optional(),
  index: z.boolean().default(false),
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
    attachFile(node, file) {
      if (!file) return node;
      const data = file.data.data as z.output<typeof frontmatter>;
      if (!data.full) return node;

      node.name = [node.name, ' ', ApiIndicator()];
      return node;
    },
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

export type Page = InferPageType<typeof utils>;
export type Meta = InferMetaType<typeof utils>;
