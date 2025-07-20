# next-docs-mdx

## 11.7.0

### Minor Changes

- f8a58c6: Support `preset: minimal` to disable Fumadocs specific defaults
- e5cfa27: Stabilize Vite plugin support

### Patch Changes

- Updated dependencies [658fa96]
- Updated dependencies [f8a58c6]
  - fumadocs-core@15.6.5
  - @fumadocs/mdx-remote@1.4.0

## 11.6.11

### Patch Changes

- 73e07a5: bump zod to v4

## 11.6.10

### Patch Changes

- d0f8a15: Enable `remarkNpm` by default, replace `remarkInstall` with it.
- Updated dependencies [d0f8a15]
- Updated dependencies [84918b8]
- Updated dependencies [f8d1709]
  - fumadocs-core@15.6.0
  - @fumadocs/mdx-remote@1.3.4

## 11.6.9

### Patch Changes

- cd86f58: Hotfix Windows EOL being ignored
- Updated dependencies [7d1ac21]
  - fumadocs-core@15.5.3

## 11.6.8

### Patch Changes

- 7a45921: Add `absolutePath` and `path` properties to pages, mark `file` as deprecated
- 1b7bc4b: Add `@types/react` to optional peer dependency to avoid version conflict in monorepos
- 14e267b: Use custom util to parse frontmatter
- Updated dependencies [7a45921]
- Updated dependencies [1b7bc4b]
  - fumadocs-core@15.5.2
  - @fumadocs/mdx-remote@1.3.3

## 11.6.7

### Patch Changes

- a5c283f: Support `outDir` option on `createMDX()`
- Updated dependencies [b4916d2]
- Updated dependencies [8738b9c]
- Updated dependencies [a66886b]
  - fumadocs-core@15.5.1

## 11.6.6

### Patch Changes

- cd42e78: Support last modified time on Async Mode
- Updated dependencies [1b999eb]
- Updated dependencies [961b67e]
- Updated dependencies [7d78bc5]
  - fumadocs-core@15.4.0

## 11.6.5

### Patch Changes

- a6c909b: Removed unused devDependencies and migrated from `fast-glob` to `tinyglobby`
- Updated dependencies [a6c909b]
  - @fumadocs/mdx-remote@1.3.2
  - fumadocs-core@15.3.4

## 11.6.4

### Patch Changes

- 4ae7b4a: Support MDX in codeblock tab value
- Updated dependencies [4ae7b4a]
  - @fumadocs/mdx-remote@1.3.1
  - fumadocs-core@15.3.3

## 11.6.3

### Patch Changes

- 4de7fe7: Fix `meta.{locale}` file being excluded from `defineDocs`
- Updated dependencies [c05dc03]
  - fumadocs-core@15.3.0

## 11.6.2

### Patch Changes

- 16c7566: Improve error handling logic on parsing meta entries
- 7b89faa: Add `page.data.content` to sync mode
  - fumadocs-core@15.2.13

## 11.6.1

### Patch Changes

- 434ccb2: Improve performance
  - fumadocs-core@15.2.9

## 11.6.0

### Minor Changes

- 7fcf612: Require Next.js 15.3.0 or above

### Patch Changes

- Updated dependencies [ec85a6c]
- Updated dependencies [e1a61bf]
  - fumadocs-core@15.2.7

## 11.5.8

### Patch Changes

- 6c5e47a: add default types for collection without schema
- Updated dependencies [1057957]
  - fumadocs-core@15.2.4

## 11.5.7

### Patch Changes

- 5163e92: Support reusing codeblocks in `<include>`
- Updated dependencies [c5add28]
- Updated dependencies [6493817]
- Updated dependencies [f3cde4f]
- Updated dependencies [7c8a690]
- Updated dependencies [b812457]
  - fumadocs-core@15.1.1
  - @fumadocs/mdx-remote@1.2.1

## 11.5.6

### Patch Changes

- 927ee8b: Fix hot reload
  - fumadocs-core@15.0.9

## 11.5.5

### Patch Changes

- e6df8aa: Improve performance
  - fumadocs-core@15.0.8

## 11.5.4

### Patch Changes

- fc5d7c0: Compile Meta files into inline JSON objects
- Updated dependencies [5deaf40]
  - fumadocs-core@15.0.7

## 11.5.3

### Patch Changes

- 65ae933: Fix dependencies

## 11.5.2

### Patch Changes

- c571417: Improve performance
- be3acf4: Improve types
  - fumadocs-core@15.0.5

## 11.5.1

### Patch Changes

- 3730739: Fix types errors

## 11.5.0

### Minor Changes

- 233a2d1: Support Standard Schema for collection `schema`
- 432c7bd: Support `defineDocs` without re-exporting `docs` and `meta` collections

### Patch Changes

- Updated dependencies [69f20cb]
  - @fumadocs/mdx-remote@1.2.0
  - fumadocs-core@15.0.3

## 11.4.1

### Patch Changes

- a8e9e1f: Bump deps
  - fumadocs-core@15.0.2

## 11.4.0

### Minor Changes

- 421166a: Improve performance, remove unused imports

### Patch Changes

- 421166a: Fix Fumadocs 14 compatibility issues
  - fumadocs-core@15.0.1

## 11.3.2

### Patch Changes

- a89d6e0: Support Fumadocs v15
- d6781cc: Fix incorrect line number with frontmatter on dev mode
- Updated dependencies [5b8cca8]
- Updated dependencies [a763058]
- Updated dependencies [581f4a5]
  - fumadocs-core@15.0.0

## 11.3.1

### Patch Changes

- 69bd4fe: Fix nested references for `<include />`
- Updated dependencies [bb73a72]
- Updated dependencies [69bd4fe]
  - fumadocs-core@14.7.4

## 11.3.0

### Minor Changes

- a4eb326: Deprecate `generateManifest` option: use a route handler to export build time information

### Patch Changes

- 7cc9f1f: Support CommonJs usage temporarily

## 11.2.3

### Patch Changes

- 0a5b08c: Fix alias imports
- Updated dependencies [72dc093]
  - fumadocs-core@14.7.1

## 11.2.2

### Patch Changes

- 97ed36c: Improve default settings
- Updated dependencies [97ed36c]
  - fumadocs-core@14.7.0

## 11.2.1

### Patch Changes

- 3445182: Fix `include` hot-reload issues
- Updated dependencies [b71064a]
  - fumadocs-core@14.6.4

## 11.2.0

### Minor Changes

- bd0a140: Support reusing content with `include` tag

### Patch Changes

- fumadocs-core@14.6.3

## 11.1.2

### Patch Changes

- fe36593: Fix global config types

## 11.1.1

### Patch Changes

- 164b9e6: Fix non-absolute `dir` option
- Updated dependencies [1573d63]
  - fumadocs-core@14.1.1

## 11.1.0

### Minor Changes

- 28a9c3c: Migrate loaders to ESM only

## 11.0.0

### Major Changes

- e094284: **Require Fumadocs v14**

### Patch Changes

- fumadocs-core@14.0.1

## 10.1.0

### Minor Changes

- 5cef1f1: Move `dir` option from `defineDocs`
- e1ee822: Support hast nodes in `toc` variable
- df9e0e1: Support `async` output mode

### Patch Changes

- 9a964ca: expose `start` function from loader
- e612f2a: Make compatible with Next.js 15
- be820c4: Bump deps
- Updated dependencies [e45bc67]
- Updated dependencies [d9e908e]
- Updated dependencies [d9e908e]
- Updated dependencies [f949520]
- Updated dependencies [9a0b09f]
- Updated dependencies [9a0b09f]
- Updated dependencies [367f4c3]
- Updated dependencies [e1ee822]
- Updated dependencies [e612f2a]
- Updated dependencies [9a0b09f]
- Updated dependencies [d9e908e]
- Updated dependencies [8ef00dc]
- Updated dependencies [979e301]
- Updated dependencies [d9e908e]
- Updated dependencies [979e301]
- Updated dependencies [15781f0]
- Updated dependencies [be820c4]
- Updated dependencies [d9e908e]
  - fumadocs-core@14.0.0

## 10.0.2

### Patch Changes

- f21c871: Change cache path of manifest files
- Updated dependencies [78e59e7]
  - fumadocs-core@13.4.8

## 10.0.1

### Patch Changes

- 7e23388: Fix windows compatibility
  - fumadocs-core@13.4.5

## 10.0.0

### Major Changes

- ed83d01: **Support declarative collections**

  **why:** This allows Fumadocs MDX to be more flexible.

  **migrate:**

  You don't need `exports` anymore, properties are merged into one object by default.

  ```diff
  - page.data.exports.toc
  + page.data.toc

  - page.data.exports.default
  + page.data.body
  ```

  A `source.config.ts` is now required.

  ```ts
  import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

  export const { docs, meta } = defineDocs();

  export default defineConfig();
  ```

  The `mdx-components.tsx` file is no longer used, pass MDX components to body instead.

  Search indexes API is now replaced by Manifest API.

  Please refer to the docs for further details.

### Patch Changes

- 0c251e5: Bump deps
- Updated dependencies [7dabbc1]
- Updated dependencies [0c251e5]
- Updated dependencies [3b56170]
  - fumadocs-core@13.4.2

## 9.0.4

### Patch Changes

- 95dbba1: Support passing remark structure options
- Updated dependencies [95dbba1]
  - fumadocs-core@13.4.1

## 9.0.3

### Patch Changes

- c0d1faf: Store additional `_data` to search indexes
  - fumadocs-core@13.4.0

## 9.0.2

### Patch Changes

- 61b91fa: Improve Fumadocs OpenAPI support
- Updated dependencies [36b771b]
- Updated dependencies [61b91fa]
  - fumadocs-core@13.2.2

## 9.0.1

### Patch Changes

- c7aa090: Improve Fumadocs OpenAPI support
- Updated dependencies [17fa173]
  - fumadocs-core@13.2.1

## 9.0.0

### Major Changes

- 1f1989e: Support Fumadocs v13

### Patch Changes

- fumadocs-core@13.0.1

## 8.2.34

### Patch Changes

- c2d956b: Support mirror pages for symlinks of MDX file
  - fumadocs-core@12.5.3

## 8.2.33

### Patch Changes

- 78acd55: Use full mode on docs pages by default on OpenAPI generated pages
  - fumadocs-core@12.2.1

## 8.2.32

### Patch Changes

- 2eb68c8: Force a release of content sources
  - fumadocs-core@12.0.7

## 8.2.31

### Patch Changes

- 310e0ab: Move `fumadocs-core` to peer dependency
- Updated dependencies [053609d]
  - fumadocs-core@12.0.3

## 8.2.30

### Patch Changes

- fumadocs-core@12.0.2

## 8.2.29

### Patch Changes

- fumadocs-core@12.0.1

## 8.2.28

### Patch Changes

- Updated dependencies [98430e9]
- Updated dependencies [d88dfa6]
- Updated dependencies [ba20694]
- Updated dependencies [57eb762]
  - fumadocs-core@12.0.0

## 8.2.27

### Patch Changes

- Updated dependencies [1b8e12b]
  - fumadocs-core@11.3.2

## 8.2.26

### Patch Changes

- fumadocs-core@11.3.1

## 8.2.25

### Patch Changes

- 17e162e: Add `mdx` to page extensions by default
- Updated dependencies [917d87f]
  - fumadocs-core@11.3.0

## 8.2.24

### Patch Changes

- fumadocs-core@11.2.2

## 8.2.23

### Patch Changes

- fumadocs-core@11.2.1

## 8.2.22

### Patch Changes

- fumadocs-core@11.2.0

## 8.2.21

### Patch Changes

- 66a100d: Improve error messages
- Updated dependencies [88008b1]
- Updated dependencies [944541a]
- Updated dependencies [07a9312]
  - fumadocs-core@11.1.3

## 8.2.20

### Patch Changes

- fumadocs-core@11.1.2

## 8.2.19

### Patch Changes

- 8ef2b68: Bump deps
- Updated dependencies [8ef2b68]
- Updated dependencies [26f464d]
- Updated dependencies [26f464d]
  - fumadocs-core@11.1.1

## 8.2.18

### Patch Changes

- fumadocs-core@11.1.0

## 8.2.17

### Patch Changes

- Updated dependencies [98258b5]
  - fumadocs-core@11.0.8

## 8.2.16

### Patch Changes

- Updated dependencies [f7c2c5c]
  - fumadocs-core@11.0.7

## 8.2.15

### Patch Changes

- 5653d5d: Support customising heading id in headings
- 5653d5d: Support custom heading slugger
- Updated dependencies [5653d5d]
- Updated dependencies [5653d5d]
  - fumadocs-core@11.0.6

## 8.2.14

### Patch Changes

- fumadocs-core@11.0.5

## 8.2.13

### Patch Changes

- 7b61b2f: Migrate `fumadocs-ui` to fully ESM, adding support for ESM `tailwind.config` file
- Updated dependencies [7b61b2f]
  - fumadocs-core@11.0.4

## 8.2.12

### Patch Changes

- fumadocs-core@11.0.3

## 8.2.11

### Patch Changes

- fumadocs-core@11.0.2

## 8.2.10

### Patch Changes

- fumadocs-core@11.0.1

## 8.2.9

### Patch Changes

- Updated dependencies [2d8df75]
- Updated dependencies [92cb12f]
- Updated dependencies [f75287d]
- Updated dependencies [2d8df75]
  - fumadocs-core@11.0.0

## 8.2.8

### Patch Changes

- Updated dependencies [bbad52f]
  - fumadocs-core@10.1.3

## 8.2.7

### Patch Changes

- fumadocs-core@10.1.2

## 8.2.6

### Patch Changes

- Updated dependencies [779c599]
- Updated dependencies [0c01300]
- Updated dependencies [779c599]
  - fumadocs-core@10.1.1

## 8.2.5

### Patch Changes

- fumadocs-core@10.1.0

## 8.2.4

### Patch Changes

- e47c62f: Support customising included files in the map file
- Updated dependencies [e47c62f]
  - fumadocs-core@10.0.5

## 8.2.3

### Patch Changes

- fumadocs-core@10.0.4

## 8.2.2

### Patch Changes

- Updated dependencies [6f321e5]
  - fumadocs-core@10.0.3

## 8.2.1

### Patch Changes

- Updated dependencies [10e099a]
  - fumadocs-core@10.0.2

## 8.2.0

### Minor Changes

- 01155f5: Support generate search indexes in build time

### Patch Changes

- Updated dependencies [c9b7763]
- Updated dependencies [0e78dc8]
- Updated dependencies [d8483a8]
  - fumadocs-core@10.0.1

## 8.1.1

### Patch Changes

- Updated dependencies [b5d16938]
- Updated dependencies [321d1e1f]
  - fumadocs-core@10.0.0

## 8.1.0

### Minor Changes

- 1c388ca5: Support `defaultOpen` for folder nodes

### Patch Changes

- Updated dependencies [909b0e35]
- Updated dependencies [691f12aa]
- Updated dependencies [1c388ca5]
  - fumadocs-core@9.1.0

## 8.0.5

### Patch Changes

- fumadocs-core@9.0.0

## 8.0.4

### Patch Changes

- fumadocs-core@8.3.0

## 8.0.3

### Patch Changes

- 9bf5adb: Replace await imports with normal imports
- Updated dependencies [5c24659]
  - fumadocs-core@8.2.0

## 8.0.2

### Patch Changes

- fumadocs-core@8.1.1

## 8.0.1

### Patch Changes

- 6c5a39a: Rename Git repository to `fumadocs`
- Updated dependencies [6c5a39a]
- Updated dependencies [eb028b4]
- Updated dependencies [054ec60]
  - fumadocs-core@8.1.0

## 8.0.0

### Major Changes

- 1a346a1: **Enable `remark-image` plugin by default**

  You can add image embeds easily. They will be converted to static image imports.

  ```mdx
  ![banner](/image.png)
  ```

  Become:

  ```mdx
  import img_banner from '../../public/image.png';

  <img alt="banner" src={img_banner} />
  ```

- 2b11c20: **Rename to Fumadocs**

  `next-docs-zeta` -> `fumadocs-core`

  `next-docs-ui` -> `fumadocs-ui`

  `next-docs-mdx` -> `fumadocs-mdx`

  `@fuma-docs/openapi` -> `fumadocs-openapi`

  `create-next-docs-app` -> `create-fumadocs-app`

### Patch Changes

- Updated dependencies [2ea9437]
- Updated dependencies [cdff313]
- Updated dependencies [1a346a1]
- Updated dependencies [2b11c20]
  - fumadocs-core@8.0.0

## 7.1.2

### Patch Changes

- next-docs-zeta@7.1.2

## 7.1.1

### Patch Changes

- next-docs-zeta@7.1.1

## 7.1.0

### Patch Changes

- next-docs-zeta@7.1.0

## 7.0.0

### Major Changes

- 9929c5b: **Prefer `.map.ts` instead of `_map.ts`**

  Unless you have especially configured, now it uses `.map.ts` by default.

  ```diff
  - import map from "@/_map"
  + import map from "@/.map"
  ```

- 9929c5b: **Migrate to Source API**

  `fromMap` has been removed. Please use `createMDXSource` instead.

  ```ts
  import { map } from '@/.map';
  import { createMDXSource } from 'next-docs-mdx';
  import { loader } from 'next-docs-zeta/source';

  export const { getPage, getPages, pageTree } = loader({
    baseUrl: '/docs',
    rootDir: 'docs',
    source: createMDXSource(map),
  });
  ```

### Minor Changes

- 8fd769f: **Support last modified timestamp for Git**

  Enable this in `next.config.mjs`:

  ```js
  const withNextDocs = createNextDocs({
    mdxOptions: {
      lastModifiedTime: 'git',
    },
  });
  ```

  Access it via `page.data.exports.lastModified`.

### Patch Changes

- Updated dependencies [9929c5b]
- Updated dependencies [9929c5b]
- Updated dependencies [49201be]
- Updated dependencies [338ea98]
- Updated dependencies [4c1334e]
- Updated dependencies [9929c5b]
  - next-docs-zeta@7.0.0

## 6.1.0

### Patch Changes

- Updated dependencies [f39ae40]
  - next-docs-zeta@6.1.0

## 6.0.2

### Patch Changes

- 1845bf5: Fixes import path for next-docs-mdx/loader-mdx
  - next-docs-zeta@6.0.2

## 6.0.1

### Patch Changes

- next-docs-zeta@6.0.1

## 6.0.0

### Major Changes

- 69f8abf: **Make file paths relative to `rootDir` when resolving files**

  For a more simplified usage, the resolved file paths will be relative to `rootDir`.

  You can now generate slugs automatically depending on the root directory you have configured.

  ```ts
  const utils = fromMap(map, {
    rootDir: 'ui',
    schema: {
      frontmatter: frontmatterSchema,
    },
  });
  ```

  The configuration above will generate `/hello` slugs for a file named `/content/ui/hello.mdx`, while the previous one generates `/ui/hello`.

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

- 1c187b9: **Support intelligent schema types**

  The `validate` options is now renamed to `schema`.

  ```ts
  import { defaultSchemas, fromMap } from 'next-docs-mdx/map';

  const utils = fromMap(map, {
    rootDir: 'docs/ui',
    baseUrl: '/docs/ui',
    schema: {
      frontmatter: defaultSchemas.frontmatter.extend({
        preview: z.string().optional(),
      }),
    },
  });
  ```

  The `frontmatter` field on pages should be automatically inferred to your Zod schema type.

- 52b24a6: **Remove `/docs` from default root content path**

  Previously, the default root content path is `./content/docs`. All your documents must be placed under the root directory.

  Since this update, it is now `./content` by default. To keep the old behaviours, you may manually specify `rootContentPath`.

  ```js
  const withNextDocs = createNextDocs({
    rootContentPath: './content/docs',
  });
  ```

  **Notice that due to this change, your `baseUrl` property will be `/` by default**

  ```diff
  const withNextDocs = createNextDocs({
  +  baseUrl: "/docs"
  })
  ```

- 2ff7581: **Rename configuration options**

  The options of `createNextDocs` is now renamed to be more flexible and straightforward.

  | Old             | New                                |
  | --------------- | ---------------------------------- |
  | `dataExports`   | `mdxOptions.valueToExport`         |
  | `pluginOptions` | `mdxOptions.rehypeNextDocsOptions` |

  `rehypePlugins` and `remarkPlugins` can also be a function that accepts and returns plugins.

### Minor Changes

- 55a2321: **Use `@mdx-js/mdx` to process MDX/markdown files.**

  You no longer need `@next/loader` and `@mdx-js/loader` to be installed on your project, `next-docs-mdx` will process files with `@mdx-js/mdx` directly.

  _This change will not break most of the projects_

### Patch Changes

- Updated dependencies [9ef047d]
  - next-docs-zeta@6.0.0

## 5.0.0

### Minor Changes

- de44efe: Migrate to Shikiji
- de44efe: Support code highlighting options

### Patch Changes

- Updated dependencies [de44efe]
- Updated dependencies [de44efe]
  - next-docs-zeta@5.0.0

## 4.0.9

### Patch Changes

- Updated dependencies [a883009]
  - next-docs-zeta@4.0.9

## 4.0.8

### Patch Changes

- Updated dependencies [e0c5c96]
  - next-docs-zeta@4.0.8

## 4.0.7

### Patch Changes

- b9af5ed: Update tsup & dependencies
- Updated dependencies [b9af5ed]
  - next-docs-zeta@4.0.7

## 4.0.6

### Patch Changes

- Updated dependencies [ff38f6e]
  - next-docs-zeta@4.0.6

## 4.0.5

### Patch Changes

- next-docs-zeta@4.0.5

## 4.0.4

### Patch Changes

- next-docs-zeta@4.0.4

## 4.0.3

### Patch Changes

- ba51a9f: Support custom slugs function
- 0cc10cb: Support custom build page tree options
- Updated dependencies [0cc10cb]
  - next-docs-zeta@4.0.3

## 4.0.2

### Patch Changes

- 347df32: Fix empty `baseUrl` unexpected behaviours
- ad7b8a8: Fully support custom root content directory paths
- 73f985a: Support `rootDir` API
  - next-docs-zeta@4.0.2

## 4.0.1

### Patch Changes

- 01b23e2: Support Next.js 14
- Updated dependencies [2da93d8]
- Updated dependencies [01b23e2]
  - next-docs-zeta@4.0.1

## 4.0.0

### Patch Changes

- Updated dependencies [6c4a782]
- Updated dependencies [6c4a782]
  - next-docs-zeta@4.0.0

## 4.0.0

### Patch Changes

- Updated dependencies [678cd3d]
- Updated dependencies [24245a3]
  - next-docs-zeta@4.0.0

## 3.0.0

### Patch Changes

- Updated dependencies [1043532]
- Updated dependencies [7a0690b]
- Updated dependencies [a4a8120]
  - next-docs-zeta@3.0.0
