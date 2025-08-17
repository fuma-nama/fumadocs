---
'fumadocs-openapi': minor
---

**Introduce `input` API on `createOpenAPI()`, unify `generateFiles()`**

Migration: Move the server object from `lib/source` to `lib/openapi`

```ts
import { createOpenAPI } from 'fumadocs-openapi/server';

export const openapi = createOpenAPI({
  input: ['./my-schema.json'],
});
```

Use the server object for `generateFiles()`:

```ts
import { generateFiles } from 'fumadocs-openapi';
import { openapi } from '@/lib/openapi';

void generateFiles({
  input: openapi,
  output: './content/docs',
  // we recommend to enable it
  // make sure your endpoint description doesn't break MDX syntax.
  includeDescription: true,
});
```