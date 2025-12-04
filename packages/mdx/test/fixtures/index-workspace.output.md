```ts title="server.ts"
// @ts-nocheck
import * as __fd_glob_1 from "./generate-index/folder/test.mdx?collection=docs"
import * as __fd_glob_0 from "./generate-index/index.mdx?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from './config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.doc("docs", "packages/mdx/test/fixtures/generate-index", {"index.mdx": __fd_glob_0, "folder/test.mdx": __fd_glob_1, });
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
  docs: create.doc("docs", {"index.mdx": () => import("./generate-index/index.mdx?collection=docs"), "folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=docs"), }),
};
export default browserCollections;
```

```ts title="test/server.ts"
// @ts-nocheck
import { frontmatter as __fd_glob_1 } from "../generate-index-2/test/test.mdx?collection=docs&only=frontmatter&workspace=test"
import { frontmatter as __fd_glob_0 } from "../generate-index-2/index.mdx?collection=docs&only=frontmatter&workspace=test"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docLazy("docs", "packages/mdx/test/fixtures/generate-index-2", {"index.mdx": __fd_glob_0, "test/test.mdx": __fd_glob_1, }, {"index.mdx": () => import("../generate-index-2/index.mdx?collection=docs&workspace=test"), "test/test.mdx": () => import("../generate-index-2/test/test.mdx?collection=docs&workspace=test"), });
```

```ts title="test/dynamic.ts"
// @ts-nocheck
import { dynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as Config from '../config';

const create = await dynamic<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>(Config, {"configPath":"packages/mdx/test/fixtures/config.ts","environment":"test","outDir":"packages/mdx/test/fixtures/test"}, {"doc":{"passthroughs":["extractedReferences"]}});
```

```ts title="test/browser.ts"
// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../generate-index-2/index.mdx?collection=docs&workspace=test"), "test/test.mdx": () => import("../generate-index-2/test/test.mdx?collection=docs&workspace=test"), }),
};
export default browserCollections;
```