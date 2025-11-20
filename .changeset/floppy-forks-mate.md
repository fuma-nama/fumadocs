---
'fumadocs-core': minor
---

**[Loader API] Default the type of `plugins` to `LoaderPluginOption[]`**

It should no longer enforce type checks on custom properties from your content source.

For creating fully typed plugins (with custom properties), use the following pattern:

```ts
import { loader } from 'fumadocs-core/source';
import { docs } from 'fumadocs-mdx:collections/server';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

export const source = loader(docs.toFumadocsSource(), {
  baseUrl: '/docs',
  plugins: ({ typedPlugin }) => [
    lucideIconsPlugin(),
    typedPlugin({
      // the plugin config
    }),
  ],
});
```
