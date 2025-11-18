```ts title="server.ts"
// @ts-nocheck
import * as __fd_glob_3 from "./generate-index/folder/test.mdx?collection=blogs"
import * as __fd_glob_2 from "./generate-index/index.mdx?collection=blogs"
import * as __fd_glob_1 from "./generate-index/folder/test.mdx?collection=docs"
import * as __fd_glob_0 from "./generate-index/index.mdx?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from './config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
    blogs: {
      /**
       * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
       */
      extractedReferences: import("fumadocs-mdx").ExtractedReference[];
    },
  }
} & {
  DocData: {
    docs: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    blogs: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
  }
}>({"doc":{"passthroughs":["extractedReferences","lastModified"]}});

export const docs = await create.doc("docs", "packages/mdx/test/fixtures/generate-index", {"index.mdx": __fd_glob_0, "folder/test.mdx": __fd_glob_1, });

export const blogs = await create.doc("blogs", "packages/mdx/test/fixtures/generate-index", {"index.mdx": __fd_glob_2, "folder/test.mdx": __fd_glob_3, });
```

```ts title="dynamic.ts"
// @ts-nocheck
import { dynamic } from 'fumadocs-mdx/runtime/dynamic';
import * as Config from './config';

const create = await dynamic<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
    blogs: {
      /**
       * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
       */
      extractedReferences: import("fumadocs-mdx").ExtractedReference[];
    },
  }
} & {
  DocData: {
    docs: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    blogs: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
  }
}>(Config, {"configPath":"packages/mdx/test/fixtures/config.ts","environment":"test","outDir":"packages/mdx/test/fixtures"}, {"doc":{"passthroughs":["extractedReferences","lastModified"]}});
```

```ts title="browser.ts"
// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from './config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
    blogs: {
      /**
       * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
       */
      extractedReferences: import("fumadocs-mdx").ExtractedReference[];
    },
  }
} & {
  DocData: {
    docs: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
    blogs: {
      /**
       * Last modified date of document file, obtained from version control.
       *
       */
      lastModified?: Date;
    },
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("./generate-index/index.mdx?collection=docs"), "folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=docs"), }),
  blogs: create.doc("blogs", {"index.mdx": () => import("./generate-index/index.mdx?collection=blogs"), "folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=blogs"), }),
};
export default browserCollections;
```