import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { createMDXSource, defaultSchemas } from 'next-docs-mdx/map';
import type { StructuredData } from 'next-docs-zeta/mdx-plugins';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { z } from 'zod';
import type { InferMetaType, InferPageType } from 'next-docs-zeta/source';
import { loader } from 'next-docs-zeta/source';
import { map } from '@/_map';

const frontmatterSchema = defaultSchemas.frontmatter.extend({
  preview: z.string().optional(),
  index: z.boolean().default(false),
});

export const utils = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createMDXSource(map, { schema: { frontmatter: frontmatterSchema } }),
});

export type Page = InferPageType<typeof utils>;
export type Meta = InferMetaType<typeof utils>;

export interface Index {
  id: string;
  title: string;
  description?: string;
  url: string;
  structuredData: StructuredData;
}

// Access and export MDX pages data to json file
// So that we can update search indexes after the build
const g = globalThis as unknown as {
  __NEXT_DOCS_INDEX_UPDATED?: boolean;
};

if (
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD &&
  !g.__NEXT_DOCS_INDEX_UPDATED
) {
  const mapPath = path.resolve('./.next/_map_indexes.json');
  const indexes: Index[] = utils.files.flatMap((file) => {
    if (file.type !== 'page') return [];

    return {
      id: file.url,
      title: file.data.title,
      description: file.data.description,
      url: file.url,
      structuredData: file.data.exports.structuredData,
    };
  });

  writeFileSync(mapPath, JSON.stringify(indexes));

  g.__NEXT_DOCS_INDEX_UPDATED = true;
}
