export type * from './runtime/shared';

// backward compat
// TODO: require importing `fumadocs-mdx/runtime/next` instead
export * from './next';

export type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';
