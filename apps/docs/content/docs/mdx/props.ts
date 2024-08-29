import { type CreateMDXOptions } from 'fumadocs-mdx/next';

export type SearchIndexOptions = NonNullable<
  Exclude<CreateMDXOptions['buildSearchIndex'], boolean>
>;
