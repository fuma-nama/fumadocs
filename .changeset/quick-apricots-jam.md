---
'next-docs-zeta': major
---

**Source API**

To reduce boilerplate, the Source API is now released to handle File-system based files.

Thanks to this, you don't have to deal with the inconsistent behaviours between different content sources anymore.

The interface is now unified, you can easily plug in a content source.

```ts
import { map } from '@/.map';
import { createMDXSource } from 'next-docs-mdx';
import { loader } from 'next-docs-zeta/source';

export const {
  getPage,
  getPages,
  pageTree,
} = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createMDXSource(map),
});
```

**Page Tree Builder API is removed in favor of this**