import type { DefaultMDXOptions } from 'fumadocs-mdx/config';
import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';
import type { FumapressConfig } from './global';
import type { ProcessorOptions } from '@mdx-js/mdx';

export interface ContentConfig {
  mdx?:
    | ({
        preset?: 'fumadocs';
      } & DefaultMDXOptions)
    | ({
        preset: 'minimal';
      } & ProcessorOptions);
}

export async function createContentConfig(config: FumapressConfig) {
  return {
    docs: defineDocs({
      dir: 'content',
      docs: {
        schema: frontmatterSchema
          .extend({
            layout: z.string().default('docs'),
          })
          .loose(),
      },
      meta: {
        schema: metaSchema.loose(),
      },
    }),
    default: defineConfig({
      mdxOptions: config.content?.mdx,
    }),
  };
}

export type FumadocsMDXConfig = Awaited<ReturnType<typeof createContentConfig>>;
