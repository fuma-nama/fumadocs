import { type CreateMDXOptions } from 'fumadocs-mdx/config';

export type SearchIndexOptions = NonNullable<
  Exclude<CreateMDXOptions['buildSearchIndex'], boolean>
>;
