```ts title="server.ts"
// @ts-nocheck
import * as __fd_glob_1 from "./generate-index/folder/test.mdx?collection=docs"
import * as __fd_glob_0 from "./generate-index/index.mdx?collection=docs"
import { fromConfig } from 'fumadocs-mdx/runtime/server';
import type * as Config from './config';

const create = fromConfig<typeof Config>();

export const docs = await create.doc("docs", "packages/mdx/test/fixtures/generate-index", {"index.mdx": __fd_glob_0, "folder/test.mdx": __fd_glob_1, });
```

```ts title="dynamic.ts"
// @ts-nocheck
import { fromConfigDynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as Config from './config';

const create = await fromConfigDynamic(Config);
```

```ts title="browser.ts"
// @ts-nocheck
import { fromConfig } from 'fumadocs-mdx/runtime/browser';
import type * as Config from './config';

const create = fromConfig<typeof Config>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("./generate-index/index.mdx?collection=docs"), "folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=docs"), }),
};
export default browserCollections;
```