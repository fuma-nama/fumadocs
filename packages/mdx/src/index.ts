export type * from './runtime/shared';

// backward compat
// TODO: require importing `fumadocs-mdx/runtime/next` instead
export * from './runtime/next';

export type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';
