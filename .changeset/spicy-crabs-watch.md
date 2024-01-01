---
'next-docs-zeta': minor
---

**Export `create` function for Contentlayer configuration**

If you want to include other document types, or override the output configuration, the `create` function can return the fields and document types you need.

```ts
import { create } from 'next-docs-zeta/contentlayer/configuration';

const config = create(options);

export default {
  contentDirPath: config.contentDirPath,
  documentTypes: [config.Docs, config.Meta],
  mdx: config.mdx,
};
```