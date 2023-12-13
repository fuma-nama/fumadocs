# next-docs-mdx

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
