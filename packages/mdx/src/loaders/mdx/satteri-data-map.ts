import type { CompilerOptions } from '@/loaders/mdx/build-mdx';

declare module 'satteri' {
  interface DataMap {
    _compiler?: CompilerOptions;
  }
}
