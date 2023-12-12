import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Utils } from 'next-docs-mdx/map';
import { defaultSchemas, fromMap } from 'next-docs-mdx/map';
import type { StructuredData } from 'next-docs-zeta/mdx-plugins';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { z } from 'zod';
import type { DefaultMetaData } from 'next-docs-mdx/types';
import { map } from '@/_map';

const frontmatterSchema = defaultSchemas.frontmatter.extend({
  preview: z.string().optional(),
  index: z.boolean().default(false),
});

export type DocsUtils = Utils<{
  languages: undefined;
  schema: {
    frontmatter: z.infer<typeof frontmatterSchema>;
    meta: DefaultMetaData;
  };
}>;

export const tabs: Record<string, DocsUtils> = {
  ui: fromMap(map, {
    rootDir: 'docs/ui',
    baseUrl: '/docs/ui',
    schema: {
      frontmatter: frontmatterSchema,
    },
  }),
  headless: fromMap(map, {
    rootDir: 'docs/headless',
    baseUrl: '/docs/headless',
    schema: {
      frontmatter: frontmatterSchema,
    },
  }),
  mdx: fromMap(map, {
    rootDir: 'docs/mdx',
    baseUrl: '/docs/mdx',
    schema: {
      frontmatter: frontmatterSchema,
    },
  }),
};

export function getUtils(mode: string): DocsUtils {
  return mode in tabs ? tabs[mode] : tabs.headless;
}

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
  const indexes: Index[] = Object.values(tabs).flatMap((tab) => {
    return tab.pages.map((page) => ({
      id: page.file.id,
      title: page.matter.title,
      description: page.matter.description,
      url: page.url,
      structuredData: page.data.structuredData,
    }));
  });

  writeFileSync(mapPath, JSON.stringify(indexes));

  g.__NEXT_DOCS_INDEX_UPDATED = true;
}
