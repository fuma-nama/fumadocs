```ts title="dynamic.ts"
import { fromConfigDynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as Config from './config';

const create = fromConfigDynamic(Config);
```

```ts title="index.ts"
import { default as __fd_glob_0 } from "file://$cwd/packages/mdx/test/fixtures/generate-index/meta.json?collection=docs"
import { fromConfig } from 'fumadocs-mdx/runtime/server';
import type * as Config from './config';

const create = fromConfig<typeof Config>();

export const docs = create.meta("docs", "packages/mdx/test/fixtures/generate-index", {"meta.json": __fd_glob_0, });
```

```ts title="browser.ts"
import { fromConfig } from 'fumadocs-mdx/runtime/browser';
import type * as Config from './config';

const create = fromConfig<typeof Config>(Config);

export const docs = create.meta("docs", {"meta.json": () => import("file://$cwd/packages/mdx/test/fixtures/generate-index/meta.json?collection=docs").then(mod => mod.default), });
```