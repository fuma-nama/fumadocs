---
'fumadocs-mdx': major
---

**Replace `getDefaultMDXOptions()` with `applyMdxPreset()`**

This allows Fumadocs MDX to support more presets in the future, and adjust presets for dynamic mode.

```ts
// source.config.ts
import { defineCollections, applyMdxPreset } from 'fumadocs-mdx/config';
import { myPlugin } from './remark-plugin';

export const blog = defineCollections({
  type: 'doc',
  mdxOptions: applyMdxPreset({
    remarkPlugins: [myPlugin],
    // You can also pass a function to control the order of remark plugins.
    remarkPlugins: (v) => [myPlugin, ...v],
  }),
});
```
