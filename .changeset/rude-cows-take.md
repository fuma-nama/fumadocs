---
'fumadocs-mdx': major
---

**Drop support for multiple `dir` in same collection**

Consider using `files` instead for filtering files.

```ts
// source.config.ts
import { defineDocs } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content/guides',
  docs: {
    files: ['./i-love-fumadocs/**/*.{md,mdx}'],
  },
});
```
