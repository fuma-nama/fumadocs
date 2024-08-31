---
'fumadocs-mdx': major
---

**Support declarative collections**

**why:** This allows Fumadocs MDX to be more flexible.

**migrate:**

You don't need `exports` anymore, properties are merged into one object by default.

```diff
- page.data.exports.toc
+ page.data.toc

- page.data.exports.default
+ page.data.body
```

A `source.config.ts` is now required.

```ts
import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const { docs, meta } = defineDocs();

export default defineConfig();
```

The `mdx-components.tsx` file is no longer used, pass MDX components to body instead.

Search indexes API is now replaced by Manifest API.

Please refer to the docs for further details.