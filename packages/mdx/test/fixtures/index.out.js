import { toRuntime } from 'fumadocs-mdx';
import * as docs_0 from './index.mdx?collection=docs&hash=hash';
import * as docs_1 from './folder/test.mdx?collection=docs&hash=hash';
export const docs = [
  toRuntime('doc', docs_0, {
    path: 'index.mdx',
    absolutePath:
      '/Users/xred/dev/fumadocs/packages/mdx/test/fixtures/index.mdx',
  }),
  toRuntime('doc', docs_1, {
    path: 'folder/test.mdx',
    absolutePath:
      '/Users/xred/dev/fumadocs/packages/mdx/test/fixtures/folder/test.mdx',
  }),
];
