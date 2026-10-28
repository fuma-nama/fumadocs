declare module 'virtual:fumadocs/config' {
  import type { CollectionOptions } from '@/index';

  /** the `collections` option */
  export const collections: Record<string, CollectionOptions>;
}
