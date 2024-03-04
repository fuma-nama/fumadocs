---
'fumadocs-openapi': major
---

**Remove support for bin usages**

why: It is more flexible and faster to write a script directly.

migrate: Create a script named `scripts/generate-docs.mjs`:

```js
import { generateFiles } from 'fumadocs-openapi';

void generateFiles({
  input: ['./petstore.yaml'],
  output: './content/docs',
});
```

Execute it with `node ./scripts/generate-docs.mjs`.