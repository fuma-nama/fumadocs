# next-docs-zeta

## 11.1.0

## 11.0.8

### Patch Changes

- 98258b5: Fix regex problems

## 11.0.7

### Patch Changes

- f7c2c5c: Fix custom heading ids conflicts with MDX syntax

## 11.0.6

### Patch Changes

- 5653d5d: Support customising heading id in headings
- 5653d5d: Support custom heading slugger

## 11.0.5

## 11.0.4

### Patch Changes

- 7b61b2f: Migrate `fumadocs-ui` to fully ESM, adding support for ESM `tailwind.config` file

## 11.0.3

## 11.0.2

## 11.0.1

## 11.0.0

### Major Changes

- 2d8df75: Remove `cwd` option from `remark-dynamic-content`

  why: Use `cwd` from vfile

  migrate: Pass the `cwd` option from remark instead

- 92cb12f: Simplify Source API virtual storage.

  why: Improve performance

  migrate:

  ```diff
  - storage.write('path.mdx', { type: 'page', ... })
  - storage.readPage('page')
  + storage.write('path.mdx', 'page', { ... })
  + storage.read('page', 'page')
  ```

  Transformers can now access file loader options.

  ```ts
  load({
    transformers: [
      ({ storage, options }) => {
        options.getUrl();
        options.getSlugs();
      },
    ],
  });
  ```

- f75287d: **Introduce `fumadocs-docgen` package.**

  Offer a better authoring experience for advanced use cases.

  - Move `remark-dynamic-content` and `remark-install` plugins to the new package `fumadocs-docgen`.
  - Support Typescript generator by default

  **Usage**

  Add the `remarkDocGen` plugin to your remark plugins.

  ```ts
  import { remarkDocGen, fileGenerator } from "fumadocs-docgen";

  remark().use(remarkDocGen, { generators: [fileGenerator()] });
  ```

  Generate docs with code blocks.

  ````mdx
  ```json doc-gen:<generator>
  {
    // options
  }
  ```
  ````

  **Migrate**

  For `remarkDynamicContent`, enable `fileGenerator` and use this syntax:

  ````mdx
  ```json doc-gen:file
  {
    "file": "./path/to/my-file.txt"
  }
  ```
  ````

  For `remarkInstall`, it remains the same:

  ```ts
  import { remarkInstall } from "fumadocs-docgen";
  ```

- 2d8df75: Remove support for `getTableOfContentsFromPortableText`

  why: Sanity integration should be provided by 3rd party integrations

  migrate: Use built-in sources, or write a custom implementation

## 10.1.3

### Patch Changes

- bbad52f: Support `bun` in `remark-install` plugin

## 10.1.2

## 10.1.1

### Patch Changes

- 779c599: Mark `getTableOfContentsFromPortableText` deprecated
- 0c01300: Fix remark-dynamic-content ignored code blocks
- 779c599: Support relative resolve path for remark-dynamic-content

## 10.1.0

## 10.0.5

### Patch Changes

- e47c62f: Improve remark plugin typings

## 10.0.4

## 10.0.3

### Patch Changes

- 6f321e5: Fix type errors of flexseach

## 10.0.2

### Patch Changes

- 10e099a: Remove deprecated options from `fumadocs-core/toc`

## 10.0.1

### Patch Changes

- c9b7763: Update to Next.js 14.1.0
- 0e78dc8: Support customising search API URL
- d8483a8: Remove undefined values from page tree

## 10.0.0

### Major Changes

- 321d1e1f: **Move Typescript integrations to `fumadocs-typescript`**

  why: It is now a stable feature

  migrate: Use `fumadocs-typescript` instead.

  ```diff
  - import { AutoTypeTable } from "fumadocs-ui/components/auto-type-table"
  + import { AutoTypeTable } from "fumadocs-typescript/ui"
  ```

### Minor Changes

- b5d16938: Support external link in `pages` property

## 9.1.0

### Minor Changes

- 909b0e35: Support duplicated names with meta and page files
- 1c388ca5: Support `defaultOpen` for folder nodes

### Patch Changes

- 691f12aa: Source API: Support relative paths as root directory

## 9.0.0

## 8.3.0

## 8.2.0

### Minor Changes

- 5c24659: Support code block icons

## 8.1.1

## 8.1.0

### Minor Changes

- eb028b4: Migrate to shiki
- 054ec60: Support generating docs for Typescript file

### Patch Changes

- 6c5a39a: Rename Git repository to `fumadocs`

## 8.0.0

### Major Changes

- 2ea9437: **Migrate to rehype-shikiji**

  - Dropped support for inline code syntax highlighting
  - Use notation-based word/line highlighting instead of meta string

  Before:

  ````md
  ```ts /config/ {1}
  const config = "Hello";

  something.call(config);
  ```
  ````

  After:

  ````md
  ```ts
  // [!code word:config]
  const config = "Hello"; // [!code highlight]

  something.call(config);
  ```
  ````

  Read the docs of Shikiji for more information.

- cdff313: **Separate Contentlayer integration into another package**

  why: As Fumadocs MDX is the preferred default source, Contentlayer should be optional.

  migrate:

  Install `fumadocs-contentlayer`.

  ```diff
  - import { createContentlayerSource } from "fumadocs-core/contentlayer"
  + import { createContentlayerSource } from "fumadocs-contentlayer"

  - import { createConfig } from "fumadocs-core/contentlayer/configuration"
  + import { createConfig } from "fumadocs-contentlayer/configuration"
  ```

- 2b11c20: **Rename to Fumadocs**

  `next-docs-zeta` -> `fumadocs-core`

  `next-docs-ui` -> `fumadocs-ui`

  `next-docs-mdx` -> `fumadocs-mdx`

  `@fuma-docs/openapi` -> `fumadocs-openapi`

  `create-next-docs-app` -> `create-fumadocs-app`

### Minor Changes

- 1a346a1: Add `remark-image` plugin that converts relative image urls into static image imports (Inspired by Nextra)

## 7.1.2

## 7.1.1

## 7.1.0

## 7.0.0

### Major Changes

- 9929c5b: **Migrate Contentlayer Integration to Source API**

  `createContentlayer` is now replaced by `createContentlayerSource`.

  You should configure base URL and root directory in the loader instead of Contentlayer configuration.

  It's no longer encouraged to access `allDocs` directly because they will not include `url` property anymore. Please consider `getPages` instead.

  ```ts
  import { allDocs, allMeta } from "contentlayer/generated";
  import { createContentlayerSource } from "next-docs-zeta/contentlayer";
  import { loader } from "next-docs-zeta/source";

  export const { getPage, pageTree, getPages } = loader({
    baseUrl: "/docs",
    rootDir: "docs",
    source: createContentlayerSource(allMeta, allDocs),
  });
  ```

  The interface is very similar, but you can only access Contentlayer properties from `page.data`.

  ```diff
  - <Content code={page.body.code} />
  + <Content code={page.data.body.code} />
  ```

- 9929c5b: **Source API**

  To reduce boilerplate, the Source API is now released to handle File-system based files.

  Thanks to this, you don't have to deal with the inconsistent behaviours between different content sources anymore.

  The interface is now unified, you can easily plug in a content source.

  ```ts
  import { map } from "@/.map";
  import { createMDXSource } from "next-docs-mdx";
  import { loader } from "next-docs-zeta/source";

  export const { getPage, getPages, pageTree } = loader({
    baseUrl: "/docs",
    rootDir: "docs",
    source: createMDXSource(map),
  });
  ```

  **Page Tree Builder API is removed in favor of this**

- 49201be: **Change `remarkToc` to `remarkHeading`**

  The previous `remarkToc` plugin only extracts table of contents from documents, now it also adds the `id` property to all heading elements.

  ```diff
  - import { remarkToc } from "next-docs-zeta/mdx-plugins"
  + import { remarkHeading } from "next-docs-zeta/mdx-plugins"
  ```

- 4c1334e: **Improve `createI18nMiddleware` function**

  Now, you can export the middleware directly without a wrapper.

  From:

  ```ts
  export default function middleware(request: NextRequest) {
    return createI18nMiddleware(...);
  }
  ```

  To:

  ```ts
  export default createI18nMiddleware({
    defaultLanguage,
    languages,
  });
  ```

### Minor Changes

- 338ea98: **Export `create` function for Contentlayer configuration**

  If you want to include other document types, or override the output configuration, the `create` function can return the fields and document types you need.

  ```ts
  import { create } from "next-docs-zeta/contentlayer/configuration";

  const config = create(options);

  export default {
    contentDirPath: config.contentDirPath,
    documentTypes: [config.Docs, config.Meta],
    mdx: config.mdx,
  };
  ```

- 9929c5b: **Support multiple page tree roots**

  You can specify a `root` property in `meta.json`, the nearest root folder will be used as the root of page tree instead.

  ```json
  {
    "title": "Hello World",
    "root": true
  }
  ```

## 6.1.0

### Minor Changes

- f39ae40: **Forward ref to `Link` and `DynamicLink` component**

  **Legacy import name `SafeLink` is now removed**

  ```diff
  - import { SafeLink } from "next-docs-zeta/link"
  + import Link from "next-docs-zeta/link"
  ```

## 6.0.2

## 6.0.1

## 6.0.0

### Major Changes

- 9ef047d: **Pre-bundle page urls into raw pages.**

  This means you don't need `getPageUrl` anymore for built-in adapters, including `next-docs-mdx` and Contentlayer. It is now replaced by the `url` property from the pages array provided by your adapter.

  Due to this change, your old configuration might not continues to work.

  ```diff
  import { fromMap } from 'next-docs-mdx/map'

  fromMap({
  -  slugs: ...
  +  getSlugs: ...
  })
  ```

  For Contentlayer, the `getUrl` option is now moved to `createConfig`.

## 5.0.0

### Minor Changes

- de44efe: Migrate to Shikiji
- de44efe: Support code highlighting options

## 4.0.9

### Patch Changes

- a883009: Fix empty extracted paragraphs in `remark-structure`

## 4.0.8

### Patch Changes

- e0c5c96: Make ESM only

## 4.0.7

### Patch Changes

- b9af5ed: Update tsup & dependencies

## 4.0.6

### Patch Changes

- ff38f6e: Replace `getGitLastEditTime` with new `getGithubLastEdit` API

## 4.0.5

## 4.0.4

## 4.0.3

### Patch Changes

- 0cc10cb: Support custom build page tree options

## 4.0.2

## 4.0.1

### Patch Changes

- 2da93d8: Support generating package install codeblocks automatically
- 01b23e2: Support Next.js 14

## 4.0.0

### Major Changes

- 6c4a782: Create `PageTreeBuilder` API

  The old `buildPageTree` function provided by 'next-docs-zeta/contentlayer' is
  now removed. Please use new API directly, or use the built-in
  `createContentlayer` utility instead.

  ```diff
  - import { buildPageTree } from 'next-docs-zeta/contentlayer'
  + import { createPageTreeBuilder } from 'next-docs-zeta/server'
  ```

### Minor Changes

- 6c4a782: Improve CommonJS/ESM compatibility

  Since this release, all server utilities will be CommonJS by default unless
  they have referenced ESM modules in the code. For instance,
  `next-docs-zeta/middleware` is now a CommonJS file. However, some modules,
  such as `next-docs-zeta/server` requires ESM-only package, hence, they remain
  a ESM file.

  Notice that the extension of client-side files is now `.js` instead of `.mjs`,
  but they're still ESM.

  **Why?**

  After migrating to `.mjs` Next.js config file, some imports stopped to work.
  The built-in Next.js bundler seems can't resolve these `next` imports in
  external packages, causing errors when modules have imported Next.js itself
  (e.g. `next/image`) in the code.

  By changing client-side files extension to `.mjs` and using CommonJS for
  server-side files, this error is solved.

## 4.0.0

### Major Changes

- 24245a3: Create `PageTreeBuilder` API

  The old `buildPageTree` function provided by 'next-docs-zeta/contentlayer' is
  now removed. Please use new API directly, or use the built-in
  `createContentlayer` utility instead.

  ```diff
  - import { buildPageTree } from 'next-docs-zeta/contentlayer'
  + import { createPageTreeBuilder } from 'next-docs-zeta/server'
  ```

### Minor Changes

- 678cd3d: Improve CommonJS/ESM compatibility

  Since this release, all server utilities will be CommonJS by default unless
  they have referenced ESM modules in the code. For instance,
  `next-docs-zeta/middleware` is now a CommonJS file. However, some modules,
  such as `next-docs-zeta/server` requires ESM-only package, hence, they remain
  a ESM file.

  Notice that the extension of client-side files is now `.js` instead of `.mjs`,
  but they're still ESM.

  **Why?**

  After migrating to `.mjs` Next.js config file, some imports stopped to work.
  The built-in Next.js bundler seems can't resolve these `next` imports in
  external packages, causing errors when modules have imported Next.js itself
  (e.g. `next/image`) in the code.

  By changing client-side files extension to `.mjs` and using CommonJS for
  server-side files, this error is solved.

## 3.0.0

### Major Changes

- a4a8120: Update search utilities import paths.

  Search Utilities in `next-docs-zeta/server` is now moved to
  `next-docs-zeta/search` and `next-docs-zeta/server-algolia`.

  Client-side Changes: `next-docs-zeta/search` -> `next-docs-zeta/search/client`
  `next-docs-zeta/search-algolia` -> `next-docs-zeta/search-algolia/client`

  If you're using Next Docs UI, make sure to import the correct path.

### Minor Changes

- 7a0690b: Export remark-toc and remark-structure MDX plugins

### Patch Changes

- 1043532: Type MDX Plugins

## 2.4.1

### Patch Changes

- dfc8b44: Remove tree root node from breadcrumb
- ef4d8cc: Expose props from SafeLink component

## 2.4.0

### Patch Changes

- 27ce871: Add missing shiki peer deps

## 2.3.3

### Patch Changes

- 634f7d3: Reduce dependencies
- eac081c: Update github urls & author name

## 2.3.2

## 2.3.1

## 2.3.0

### Minor Changes

- 6664178: Support algolia search
- a0f9911: Support `useAlgoliaSearch`
- 6664178: Improve search document structurize algorithm

## 2.2.0

## 2.1.2

### Patch Changes

- dfbbc17: Exclude index page from "..." operator
- 79227d8: Fix breadcrumb resolve index file

## 2.1.1

## 2.1.0

### Patch Changes

- a5a661e: Remove `item` prop from TOC items

## 2.0.3

## 2.0.2

### Patch Changes

- 74e5e85: Contentlayer: Support rest item in meta.json
- 72e9fdf: Contentlayer: Support extracting folder in meta.json

## 2.0.1

### Patch Changes

- 48c5256: Contentlayer: Sort pages by default

## 2.0.0

## 1.6.9

## 1.6.8

## 1.6.7

## 1.6.6

## 1.6.5

### Patch Changes

- 79abe84: Support collapsible sidebar

## 1.6.4

## 1.6.3

### Patch Changes

- 8d07003: Replace type of `TreeNode[]` with `PageTree`

## 1.6.2

## 1.6.1

### Patch Changes

- fc6279e: Support get last git edit time

## 1.6.0

### Minor Changes

- edb9930: Redesign Contentlayer adapter API

### Patch Changes

- cdd30d5: Create remark-dynamic-content plugin

## 1.5.3

### Patch Changes

- fa8d4cf: Update dependencies

## 1.5.2

## 1.5.1

## 1.5.0

### Minor Changes

- fb2abb3: Rewrite create search API & stabilize experimental Advanced Search

## 1.4.1

### Patch Changes

- Support better document search with `experimental_initSearchAPI`
- 3d92c92: Support custom computed fields in Contentlayer

## 1.4.0

### Patch Changes

- 0f106d9: Fix default sidebar element type

## 1.3.1

### Patch Changes

- ff05f5d: Support custom fields in Contentlayer configuration generator
- 7fb2b9e: Support custom page & folder icons

## 1.3.0

### Minor Changes

- 98226d9: Rewrite slugger and TOC utilities

## 1.2.1

### Patch Changes

- b15895f: Remove url prop from page tree folders

## 1.2.0

### Patch Changes

- 5f248fb: Support Auto Scroll in TOC for headless docs

## 1.1.4

### Patch Changes

- 496a6b0: Configure eslint + prettier

## 1.1.3

### Patch Changes

- 0998b1b: Support edge runtime middlewares

## 1.1.2

### Patch Changes

- Fix aria attributes

## 1.1.1

## 1.1.0

### Patch Changes

- 255fc92: Support finding neighbours of a page & Flatten page tree

## 1.0.0

### Major Changes

- 8e4a001: Rewrite Contentlayer tree builder + Support Context API

### Minor Changes

- 4fa45c0: Add support for dynamic hrefs and relative paths to `<SafeLink />`
  component
- 0983891: Add international Docs search

## 0.3.2

## 0.3.1

## 0.3.0

## 0.2.1

### Patch Changes

- 67cd8ab: Remove unused files in dist

## 0.2.0

### Minor Changes

- 5ff94af: Replace TOC data attribute `data-active` with `aria-selected`

### Patch Changes

- 5ff94af: Fix contentlayer parser bugs

## 0.1.0

### Minor Changes

- Add get toc utils for sanity (portable text)

## 0.0.2

### Patch Changes

- d909192: Fix several contentlayer scanner bugs
- e88eec8: Add README
