# next-docs-ui

## 7.0.0

### Major Changes

- f995ad9: **Page Footer is now a client component**

  This allows the footer component to find items within the current page tree, which fixes the problem where a item from another page tree is appeared.

  Also removed the `url` and `tree` properties from `DocsPage` since we can pass them via React Context API.

  ```diff
  export default async function Page({ params }) {
    return (
      <DocsPage
  -      url={page.url}
  -      tree={pageTree}
      >
        ...
      </DocsPage>
    );
  }
  ```

  The `footer` property in `DocsPage` has also updated, now you can specify or replace the default footer component.

  ```tsx
  <DocsPage footer={{ items: {} }}>...</DocsPage>
  ```

### Minor Changes

- b30d1cd: **Support theme presets**

  Add theme presets for the Tailwind CSS plugin, the default and ocean presets are available now.

  ```js
  const { docsUi, docsUiPlugins } = require('next-docs-ui/tailwind-plugin');

  /** @type {import('tailwindcss').Config} */
  module.exports = {
    plugins: [
      ...docsUiPlugins,
      docsUi({
        preset: 'ocean',
      }),
    ],
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

### Patch Changes

- Updated dependencies [9929c5b]
- Updated dependencies [9929c5b]
- Updated dependencies [49201be]
- Updated dependencies [338ea98]
- Updated dependencies [4c1334e]
- Updated dependencies [9929c5b]
  - next-docs-zeta@7.0.0

## 6.1.0

### Minor Changes

- 6e0d2e1: **Support `Layout` for non-docs pages (without page tree)**

  Same as Docs Layout but doesn't include a sidebar. It can be used outside of the docs, a page tree is not required.

  ```jsx
  import { Layout } from 'next-docs-ui/layout';

  export default function HomeLayout({ children }) {
    return <Layout>{children}</Layout>;
  }
  ```

  **`nav.items` prop is deprecated**

  It is now replaced by `links`.

- 2a82e9d: **Support linking to accordions**

  You can now specify an `id` for accordion. The accordion will automatically open when the user is navigating to the page with the specified `id` in hash parameter.

  ```mdx
  <Accordions>
  <Accordion title="My Title" id="my-title">

  My Content

  </Accordion>
  </Accordions>
  ```

### Patch Changes

- 65b7f30: Improve search dialog design
- Updated dependencies [f39ae40]
  - next-docs-zeta@6.1.0

## 6.0.2

### Patch Changes

- next-docs-zeta@6.0.2

## 6.0.1

### Patch Changes

- 515a3e1: Fix inline code blocks are not highlighted
  - next-docs-zeta@6.0.1

## 6.0.0

### Major Changes

- 983ede8: **Remove `not-found` component**

  The `not-found` component was initially intended to be the default 404 page. However, we found that the Next.js default one is good enough. For advanced cases, you can always build your own 404 page.

- ebe8d9f: **Support Tailwind CSS plugin usage**

  If you are using Tailwind CSS for your docs, it's now recommended to use the official plugin instead.

  ```js
  const { docsUi, docsUiPlugins } = require('next-docs-ui/tailwind-plugin');

  /** @type {import('tailwindcss').Config} */
  module.exports = {
    darkMode: 'class',
    content: [
      './components/**/*.{ts,tsx}',
      './app/**/*.{ts,tsx}',
      './content/**/*.mdx',
      './node_modules/next-docs-ui/dist/**/*.js',
    ],
    plugins: [...docsUiPlugins, docsUi],
  };
  ```

  The `docsUi` plugin adds necessary utilities & colors, and `docsUiPlugins` are its dependency plugins which should not be missing.

- 7d89e83: **Add required property `url` to `<DocsPage />` component**

  You must pass the URL of current page to `<DocsPage />` component.

  ```diff
  export default function Page({ params }) {
    return (
      <DocsPage
  +      url={page.url}
        toc={page.data.toc}
      >
        ...
      </DocsPage>
    )
  }
  ```

  **`footer` property is now optional**

  Your `footer` property in `<DocsPage />` will be automatically generated if not specified.

  ```ts
  findNeighbour(tree, url);
  ```

- 0599d50: **Separate MDX components**

  Previously, you can only import the code block component from `next-docs-ui/mdx` (Client Component) and `next-docs-ui/mdx-server` (Server Component).

  This may lead to confusion, hence, it is now separated into multiple files. You can import these components regardless it is either a client or a server component.

  Notice that `MDXContent` is now renamed to `DocsBody`, you must import it from `next-docs-ui/page` instead.

  ```diff
  - import { MDXContent } from "next-docs-ui/mdx"
  - import { MDXContent } from "next-docs-ui/mdx-server"

  + import { DocsBody } from "next-docs-ui/page"
  ```

  ```diff
  - import { Card, Cards } from "next-docs-ui/mdx"
  + import { Card, Cards } from "next-docs-ui/mdx/card"

  - import { Pre } from "next-docs-ui/mdx"
  + import { Pre } from "next-docs-ui/mdx/pre"

  - import { Heading } from "next-docs-ui/mdx"
  + import { Heading } from "next-docs-ui/mdx/heading"

  - import defaultComponents from "next-docs-ui/mdx"
  + import defaultComponents from "next-docs-ui/mdx/default-client"

  - import defaultComponents from "next-docs-ui/mdx-server"
  + import defaultComponents from "next-docs-ui/mdx/default"
  ```

### Minor Changes

- 56a35ce: Support custom `searchOptions` in Algolia Search Dialog

### Patch Changes

- 5c98f7f: Support custom attributes to `pre` element inside code blocks
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

- 70545e7: Support `enableThemeProvider` option in RootProvider
- Updated dependencies [a883009]
  - next-docs-zeta@4.0.9

## 4.0.8

### Patch Changes

- e0c5c96: Make ESM only
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

- f00e38f: Use `dvh` for sidebar height
  - next-docs-zeta@4.0.5

## 4.0.4

### Patch Changes

- 1b10e13: Default accordion type to "single"
  - next-docs-zeta@4.0.4

## 4.0.3

### Patch Changes

- Updated dependencies [0cc10cb]
  - next-docs-zeta@4.0.3

## 4.0.2

### Patch Changes

- next-docs-zeta@4.0.2

## 4.0.1

### Patch Changes

- 927714a: Remove dropdown from theme toggle
- d58e90a: Use await imports to import client components in Server Components
- cc1fe39: Render TOC header & footer in Server Component
- 01b23e2: Support Next.js 14
- d58e90a: Add y margins to Callout and Pre component
- Updated dependencies [2da93d8]
- Updated dependencies [01b23e2]
  - next-docs-zeta@4.0.1

## 4.0.0

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

- 6c4a782: Support Server Component usage for MDX default components

### Patch Changes

- b2112e8: Improve default codeblock
- 6c4a782: Fix sidebar opening issue
- Updated dependencies [6c4a782]
- Updated dependencies [6c4a782]
  - next-docs-zeta@4.0.0

## 4.0.0

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

- d2eb490: Support Server Component usage for MDX default components

### Patch Changes

- 0175b4f: Fix sidebar opening issue
- Updated dependencies [678cd3d]
- Updated dependencies [24245a3]
  - next-docs-zeta@4.0.0

## 3.0.0

### Minor Changes

- 522ed48: Update typography & layout styles

### Patch Changes

- a4a8120: Update search utilities import paths.

  Search Utilities in `next-docs-zeta/server` is now moved to
  `next-docs-zeta/search` and `next-docs-zeta/server-algolia`.

  Client-side Changes: `next-docs-zeta/search` -> `next-docs-zeta/search/client`
  `next-docs-zeta/search-algolia` -> `next-docs-zeta/search-algolia/client`

  If you're using Next Docs UI, make sure to import the correct path.

- Updated dependencies [1043532]
- Updated dependencies [7a0690b]
- Updated dependencies [a4a8120]
  - next-docs-zeta@3.0.0

## 2.4.1

### Patch Changes

- dc4f10d: Fix Callout component overflow
- 841a18b: Support passing extra props to Card components
- Updated dependencies [dfc8b44]
- Updated dependencies [ef4d8cc]
  - next-docs-zeta@2.4.1

## 2.4.0

### Minor Changes

- 82c4fc6: Override default typography styles
- 25e6856: Create Callout component

### Patch Changes

- 1cb6385: Improve Inline TOC component
- Updated dependencies [27ce871]
  - next-docs-zeta@2.4.0

## 2.3.3

### Patch Changes

- 634f7d3: Reduce dependencies
- 996a914: Create Inline TOC component
- eac081c: Update github urls & author name
- Updated dependencies [634f7d3]
- Updated dependencies [eac081c]
  - next-docs-zeta@2.3.3

## 2.3.2

### Patch Changes

- e0ebafa: Improve global padding
  - next-docs-zeta@2.3.2

## 2.3.1

### Patch Changes

- cd0b4a3: Support CSS classes usage for steps component
- cd0b4a3: Fix TOC marker position
  - next-docs-zeta@2.3.1

## 2.3.0

### Minor Changes

- 32a4669: Support algolia search dialog

### Patch Changes

- cef6143: Fix toc marker position
- 32a4669: Improve search API usage
- b65219c: Separate default and custom search dialog
- 9c3bc86: Improve i18n language select
- 6664178: Support custom search function for search dialog
- Updated dependencies [6664178]
- Updated dependencies [a0f9911]
- Updated dependencies [6664178]
  - next-docs-zeta@2.3.0

## 2.2.0

### Minor Changes

- 1ff7172: Remove support for importing "next-docs-ui/components", please use
  "next-docs-ui/nav" instead

### Patch Changes

- e546f4e: Hotfix sidebar collapsible not closing
  - next-docs-zeta@2.2.0

## 2.1.2

### Patch Changes

- a3f443f: Improve colors in light mode
- 2153fc8: Improve navbar transparent mode
- 4e7e0d2: Replace `next-docs-ui/components` with `next-docs-ui/nav`
- 4816737: Fix sidebar collapsible button
- Updated dependencies [dfbbc17]
- Updated dependencies [79227d8]
  - next-docs-zeta@2.1.2

## 2.1.1

### Patch Changes

- 14459cf: Fix image-zoom causes viewport overflow on IOS devices
- a015445: Improve search toggle
- 794c2c6: Remove default icon from cards
  - next-docs-zeta@2.1.1

## 2.1.0

### Minor Changes

- db050fc: Redesign default theme & layout

### Patch Changes

- b527988: Files component support custom icons
- 69a4469: Animate TOC marker
- dbe1bcf: Support transparent navbar for custom navbar
- Updated dependencies [a5a661e]
  - next-docs-zeta@2.1.0

## 2.0.3

### Patch Changes

- caa7e98: Fix sidebar animation problems
- caa7e98: Improve copy button in codeblocks
  - next-docs-zeta@2.0.3

## 2.0.2

### Patch Changes

- 74e5e85: Several UI improvements
- Support adding header to TOC component
- Updated dependencies [74e5e85]
- Updated dependencies [72e9fdf]
  - next-docs-zeta@2.0.2

## 2.0.1

### Patch Changes

- 8a05955: Improve syntax highlighting
- Updated dependencies [48c5256]
  - next-docs-zeta@2.0.1

## 2.0.0

### Major Changes

- 9bf1297: Update API usage

### Patch Changes

- e8b3e50: Use react-medium-image-zoom for zoom images
- 6c408d0: Change layout width
  - next-docs-zeta@2.0.0

## 1.6.9

### Patch Changes

- 5ee874c: Create Accordions component
- 1630f74: Add default border to TOC content
  - next-docs-zeta@1.6.9

## 1.6.8

### Patch Changes

- 4cf4552: Fix aria-controls warning & support default index
  - next-docs-zeta@1.6.8

## 1.6.7

### Patch Changes

- f72a4c1: Improve animations & layout
- 88bab2f: Support `lastUpdate` in page
- f1846e8: Support i18n search dialog placeholder
  - next-docs-zeta@1.6.7

## 1.6.6

### Patch Changes

- be8a93d: Support sidebar default open level
  - next-docs-zeta@1.6.6

## 1.6.5

### Patch Changes

- b8a76f8: Fix theme toggle wrong icon
- 7337d59: Create Zoom Image component
- 79abe84: Support collapsible sidebar
- Updated dependencies [79abe84]
  - next-docs-zeta@1.6.5

## 1.6.4

### Patch Changes

- e6ebf6a: Rename `sidebarContent` to `sidebarFooter`
- e01bf3a: Allow `true` to keep default
- e6ebf6a: Imrove sidebar banner
  - next-docs-zeta@1.6.4

## 1.6.3

### Patch Changes

- Support replacing breadcrumb
- 8d07003: Replace type of `TreeNode[]` with `PageTree`
- Updated dependencies [8d07003]
  - next-docs-zeta@1.6.3

## 1.6.2

### Patch Changes

- 5512300: Support custom navbar items
- af8720b: Improve default code block
- 2836799: Support I18n text in built-in components
  - next-docs-zeta@1.6.2

## 1.6.1

### Patch Changes

- 689c75d: Create Files component
- Updated dependencies [fc6279e]
  - next-docs-zeta@1.6.1

## 1.6.0

### Patch Changes

- 037d5e5: Export default mdx components
- Updated dependencies [cdd30d5]
- Updated dependencies [edb9930]
  - next-docs-zeta@1.6.0

## 1.5.3

### Patch Changes

- fa8d4cf: Update dependencies
- f0ab1ba: Improve typography
- Updated dependencies [fa8d4cf]
  - next-docs-zeta@1.5.3

## 1.5.2

### Patch Changes

- 1906e80: Create steps component
  - next-docs-zeta@1.5.2

## 1.5.1

### Patch Changes

- d4f718d: Support disabling TOC & Sidebar
  - next-docs-zeta@1.5.1

## 1.5.0

### Patch Changes

- Updated dependencies [fb2abb3]
  - next-docs-zeta@1.5.0

## 1.4.1

### Patch Changes

- 8883553: Support tabs component
- d084de2: Export default search dialog
- Improve Search Dialog UI
- Updated dependencies
- Updated dependencies [3d92c92]
  - next-docs-zeta@1.4.1

## 1.4.0

### Minor Changes

- 45a174a: Split roll-button into optional component

### Patch Changes

- ed385ab: Add Type Table component
- 5407360: Improve sidebar layout
- Updated dependencies [0f106d9]
  - next-docs-zeta@1.4.0

## 1.3.1

### Patch Changes

- 21725e4: Support replacing default search dialog component
- 7fb2b9e: Support custom page & folder icons
- Updated dependencies [ff05f5d]
- Updated dependencies [7fb2b9e]
  - next-docs-zeta@1.3.1

## 1.3.0

### Minor Changes

- 98226d9: Rewrite slugger and TOC utilities

### Patch Changes

- 6999268: Support custom codeblock meta in Codeblocks
- Change default typography
- Updated dependencies [98226d9]
  - next-docs-zeta@1.3.0

## 1.2.1

### Patch Changes

- 1b626c9: Redesign UI
- ce10df9: Support custom sidebar banner
- Updated dependencies [b15895f]
  - next-docs-zeta@1.2.1

## 1.2.0

### Minor Changes

- Remove `tree` prop from Docs Page, replaced by pages context.

### Patch Changes

- 5f248fb: Support Auto Scroll in TOC for headless docs
- Updated dependencies [5f248fb]
  - next-docs-zeta@1.2.0

## 1.1.4

### Patch Changes

- 496a6b0: Improve footer design
- 496a6b0: Configure eslint + prettier
- Updated dependencies [496a6b0]
  - next-docs-zeta@1.1.4

## 1.1.3

### Patch Changes

- 10d31e6: Fix sidebar scrollbars disappeared
- Updated dependencies [0998b1b]
  - next-docs-zeta@1.1.3

## 1.1.2

### Patch Changes

- Fix aria attributes
- Improve footer styles
- Updated dependencies
  - next-docs-zeta@1.1.2

## 1.1.1

### Patch Changes

- Fix codeblocks not being generated correctly
  - next-docs-zeta@1.1.1

## 1.1.0

### Minor Changes

- 524ca9a: Support page footer

### Patch Changes

- d810bbd: Improve codeblock styles
- d810bbd: Add `<RollButton />` component
- Updated dependencies [255fc92]
  - next-docs-zeta@1.1.0

## 1.0.0

### Minor Changes

- d30d57f: Support optional I18n context provider

### Patch Changes

- Improve codeblock styles
- Updated dependencies [8e4a001]
- Updated dependencies [4fa45c0]
- Updated dependencies [0983891]
  - next-docs-zeta@1.0.0

## 0.3.2

### Patch Changes

- Fix unexpected trailing slash on Contentlayer v0.3.4
- Add Auto scroll for TOC
  - next-docs-zeta@0.3.2

## 0.3.1

### Patch Changes

- Use Radix UI scroll area
- d91de39: Fix sticky position for TOC and Sidebar
  - next-docs-zeta@0.3.1

## 0.3.0

### Minor Changes

- Support next.js images in MDX files

### Patch Changes

- next-docs-zeta@0.3.0

## 0.1.2

### Patch Changes

- 67cd8ab: Remove unused files in dist
- Updated dependencies [67cd8ab]
  - next-docs-zeta@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [5ff94af]
- Updated dependencies [5ff94af]
  - next-docs-zeta@0.2.0
