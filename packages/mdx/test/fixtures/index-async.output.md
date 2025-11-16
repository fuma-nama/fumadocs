```ts title="server.ts"
// @ts-nocheck
import { frontmatter as __fd_glob_1 } from "./generate-index/folder/test.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_0 } from "./generate-index/index.mdx?collection=docs&only=frontmatter"
import { fromConfig } from 'fumadocs-mdx/runtime/server';
import type * as Config from './config';

const create = fromConfig<typeof Config>();

export const docs = await create.docLazy("docs", "packages/mdx/test/fixtures/generate-index", {"index.mdx": __fd_glob_0, "folder/test.mdx": __fd_glob_1, }, {"index.mdx": () => import("./generate-index/index.mdx?collection=docs"), "folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=docs"), });
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