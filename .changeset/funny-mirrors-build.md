---
'fumadocs-mdx': major
---

**Replace `lastModifiedTime` option with `lastModified` plugin.**

If you've `lastModifiedTime` option enabled before, migrate to the plugin instead.

```ts
// source.config.ts
import { defineConfig } from 'fumadocs-mdx/config';
import lastModified from 'fumadocs-mdx/plugins/last-modified';

export default defineConfig({
  plugins: [lastModified()],
});
```
