---
'fumadocs-openapi': major
---

**Expect OpenAPI server to use `generateFiles()`**

File generation is now part of OpenAPI server, the `input` field requires the server instead of string array.

Before:

```ts
import { openapi } from '@/lib/openapi';

void generateFiles({
  input: ['./products.yaml'],
  output: './content/docs',
});
```

After:

```ts
import { generateFiles } from 'fumadocs-openapi';
import { openapi } from '@/lib/openapi';

void generateFiles({
  input: openapi,
  output: './content/docs',
});
```