```ts title="server.ts"
// @ts-nocheck
import { default as __fd_glob_0 } from "./generate-index/meta.json?collection=docs"
import { fromConfig } from 'fumadocs-mdx/runtime/server';
import type * as Config from './config';

const create = fromConfig<typeof Config>();

export const docs = await create.meta("docs", "packages/mdx/test/fixtures/generate-index", {"meta.json": __fd_glob_0, });
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
};
export default browserCollections;
```