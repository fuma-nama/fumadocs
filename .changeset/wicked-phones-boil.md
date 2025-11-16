---
'fumadocs-mdx': major
---

**No longer generate `extractedReferences` by default**

You can enable it from `postprocess` option.

```ts
// source.config.ts
import { defineDocs } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  docs: {
    postprocess: {
      extractLinkReferences: true,
    },
  },
});
```
