# next-docs-mdx

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
