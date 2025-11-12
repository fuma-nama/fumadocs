```ts title="dynamic.ts"
import { fromConfigDynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as Config from './config';

const create = fromConfigDynamic(Config);
```

```ts title="index.ts"
import { frontmatter as __fd_glob_1 } from "file://$cwd/packages/mdx/test/fixtures/generate-index/folder/test.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_0 } from "file://$cwd/packages/mdx/test/fixtures/generate-index/index.mdx?collection=docs&only=frontmatter"
import { fromConfig } from 'fumadocs-mdx/runtime/server';
import type * as Config from './config';

const create = fromConfig<typeof Config>();

export const docs = create.docLazy("docs", "packages/mdx/test/fixtures/generate-index", {"index.mdx": __fd_glob_0, "folder/test.mdx": __fd_glob_1, }, {"index.mdx": () => import("file://$cwd/packages/mdx/test/fixtures/generate-index/index.mdx?collection=docs"), "folder/test.mdx": () => import("file://$cwd/packages/mdx/test/fixtures/generate-index/folder/test.mdx?collection=docs"), });
```

```ts title="browser.ts"
import { fromConfig } from 'fumadocs-mdx/runtime/browser';
import type * as Config from './config';

const create = fromConfig<typeof Config>(Config);

export const docs = create.doc("docs", {"index.mdx": () => import("file://$cwd/packages/mdx/test/fixtures/generate-index/index.mdx?collection=docs"), "folder/test.mdx": () => import("file://$cwd/packages/mdx/test/fixtures/generate-index/folder/test.mdx?collection=docs"), });
```