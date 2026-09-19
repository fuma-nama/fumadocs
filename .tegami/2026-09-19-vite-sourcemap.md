---
packages:
  npm:fumadocs-mdx: patch
---

## Fix `SOURCEMAP_BROKEN` warnings on Vite

With `build.sourcemap` enabled, Vite warned once per content and meta file because the loaders returned no source map. They now return an empty map when nothing is generated.

Source maps for MDX stay opt-in, pass `SourceMapGenerator` from `source-map` to MDX options:

```ts
import { SourceMapGenerator } from 'source-map';

export default defineConfig({
  mdxOptions: {
    SourceMapGenerator,
  },
});
```
