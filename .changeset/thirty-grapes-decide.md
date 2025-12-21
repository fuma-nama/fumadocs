---
'fumadocs-typescript': major
---

**Require explicit cache**

Previously, we enabled file system cache by default, but the directory is not customisable and only support Next.js.

Now, cache is disabled by default and require explicit declaration.

Update all your `createGenerator()` calls:

```ts
import {
  createGenerator,
  createFileSystemGeneratorCache,
} from 'fumadocs-typescript';

const generator = createGenerator({
  // add this!
  cache: createFileSystemGeneratorCache('.next/fumadocs-typescript'),
});
```
