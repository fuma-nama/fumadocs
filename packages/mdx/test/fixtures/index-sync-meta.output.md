```ts title="server.ts"
// @ts-nocheck
import { default as __fd_glob_0 } from "./generate-index/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from './config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.meta("docs", "packages/mdx/test/fixtures/generate-index", {"meta.json": __fd_glob_0, });
```

```ts title="dynamic.ts"
// @ts-nocheck
import { dynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as Config from './config';

const create = await dynamic<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>(Config, {"configPath":"packages/mdx/test/fixtures/config.ts","environment":"test","outDir":"packages/mdx/test/fixtures"}, {"doc":{"passthroughs":["extractedReferences"]}});
```

```ts title="browser.ts"
// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from './config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
};
export default browserCollections;
```