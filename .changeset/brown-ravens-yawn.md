---
'next-docs-mdx': major
---

**Support intelligent schema types**

The `validate` options is now renamed to `schema`.

```ts
import { defaultSchemas, fromMap } from 'next-docs-mdx/map';

const utils = fromMap(map, {
  rootDir: 'docs/ui',
  baseUrl: '/docs/ui',
  schema: {
    frontmatter: defaultSchemas.frontmatter.extend({
      preview: z.string().optional(),
    }),
  },
})
```

The `frontmatter` field on pages should be automatically inferred to your Zod schema type.