---
'next-docs-zeta': major
---

**Migrate Contentlayer Integration to Source API**

`createContentlayer` is now replaced by `createContentlayerSource`.

You should configure base URL and root directory in the loader instead of Contentlayer configuration.

It's no longer encouraged to access `allDocs` directly because they will not include `url` property anymore. Please consider `getPages` instead.

```ts
import { allDocs, allMeta } from 'contentlayer/generated';
import { createContentlayerSource } from 'next-docs-zeta/contentlayer';
import { loader } from 'next-docs-zeta/source';

export const { getPage, pageTree, getPages } = loader({
  baseUrl: '/docs',
  rootDir: 'docs',
  source: createContentlayerSource(allMeta, allDocs),
});
```

The interface is very similar, but you can only access Contentlayer properties from `page.data`.

```diff
- <Content code={page.body.code} />
+ <Content code={page.data.body.code} />
```