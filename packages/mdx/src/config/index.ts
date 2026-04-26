export * from './define';
export * from '@/config/preset';
export { remarkInclude } from '@/loaders/mdx/remark-include';
import { metaSchema as m, pageSchema as p } from 'fumadocs-core/source/schema';

/** @deprecated import `pageSchema` from `fumadocs-core/source/schema` instead (since 16.2.3) */
export const frontmatterSchema = p;
/** @deprecated import from `fumadocs-core/source/schema` instead (since 16.2.3) */
export const metaSchema = m;

export type { PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
