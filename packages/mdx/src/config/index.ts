export * from './define';
export * from '@/config/preset';
export { remarkInclude } from '@/loaders/mdx/remark-include';

export type { PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
export {
  /** @deprecated import from `fumadocs-core/source/schema` instead (since 16.2.3) */
  metaSchema,
  /** @deprecated import `pageSchema` from `fumadocs-core/source/schema` instead (since 16.2.3) */
  pageSchema as frontmatterSchema,
} from 'fumadocs-core/source/schema';
