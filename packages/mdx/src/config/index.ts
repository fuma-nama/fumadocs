export * from './define';
export * from '@/config/preset';
export { remarkInclude } from '@/loaders/mdx/remark-include';

export type { PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
export { metaSchema, pageSchema as frontmatterSchema } from 'fumadocs-core/source/schema';
