## fumadocs-docgen@3.2.0

### Markdown and search records from the authored source

`remarkLLMs()` and `remarkStructure()` of `fumadocs-core` slice their Markdown from the authored source like Sätteri, instead of stringifying the syntax tree. It is much faster, Markdown is no longer escaped or reformatted, and local images keep their addresses. Re-sync your search indexes to pick up the new records.

- Plugins record the Markdown of content they replace with `replaceSource()` or `embedSource()` from `fumadocs-core/mdx-plugins/stringifier`, in place of `data._stringify`, and add search records with `data.structuredData`. Nodes they insert otherwise are left out. A `namespace` limits an edit to the stringifiers of that namespace, like `search` for search records.
- Search records are always Markdown, also in Sätteri. `filterElement` replaces `stringify.filterElement`, it chooses the JSX elements kept as HTML tags (`File`, `TypeTable`, `Callout` and `Card` by default) that search dialogs render as components. Other elements and links are replaced by their content, images are removed, and an element on one line is recorded like a paragraph.
- Removed `defaultStringifier()` (use `createStringifier()`), `StringifyOptions`, `allowedMdxAttributes`, `filterMdxAttributes`, `placeholder()` (use `mdxAsPlaceholder`), and the `stringify` and `mdast-util-to-markdown` options of both plugins.
- Included content goes through the plugins like the document's own, Sätteri includes `.md` files as Markdown.
- `<auto-files>` shows its files in a code block, `auto-type-table` its props in a Markdown table, created by `typeTableToMarkdown()` from `fumadocs-typescript`.
- `remarkShow()` and `fileGenerator()` of `fumadocs-docgen` record their Markdown, generators receive the `file` to do the same.
- Records of `fumadocs-obsidian` resolve wikilinks, and leave comments, block IDs, callout markers and embeds out. Comments are removed before parsing, so they no longer split a paragraph.
- Pages of `fumadocs-python` compile from their MDX, so they have Markdown and search records.
- `fumadocs-mdx`, `fumadocs-docgen` and `fumadocs-obsidian` require `fumadocs-core` 16.17.0.

Fix [#3662](https://github.com/fuma-nama/fumadocs/issues/3662)

## fumadocs-docgen@3.1.1

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## fumadocs-docgen@3.1.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

# fumadocs-docgen

## 3.0.10

### Patch Changes

- 2d8f596: fix `npm pack` skipping nested `node_modules`
- Updated dependencies [2d8f596]
  - fumadocs-core@16.7.14

## 3.0.9

### Patch Changes

- 690ddb9: bundle more deps
- Updated dependencies [690ddb9]
  - fumadocs-core@16.7.13

## 3.0.8

### Patch Changes

- 5453502: use Shiki.js v4
- Updated dependencies [5453502]
  - fumadocs-core@16.6.8

## 3.0.7

### Patch Changes

- 1a614de: enforce MDX stringifier by default
- Updated dependencies [1a614de]
- Updated dependencies [6ab6692]
  - fumadocs-core@16.6.5

## 3.0.6

### Patch Changes

- c22f6ee: bump tsdown
- Updated dependencies [c22f6ee]
  - fumadocs-core@16.5.2

## 3.0.5

### Patch Changes

- b16a32f: Switch to tsdown for bundling
- Updated dependencies [590d36a]
- Updated dependencies [98d38ff]
- Updated dependencies [446631d]
- Updated dependencies [b16a32f]
  - fumadocs-core@16.4.2

## 3.0.4

### Patch Changes

- ca09b6a: Core: Support accessing MDX plugins separately at `fumadocs-core/mdx-plugins/*`
- Updated dependencies [bc97236]
- Updated dependencies [ca09b6a]
- Updated dependencies [117ad86]
  - fumadocs-core@16.0.8

## 3.0.3

### Patch Changes

- 5210f18: Support Fumadocs 16 in `peerDependencies`.
- Updated dependencies [230c6bf]
- Updated dependencies [851897c]
- Updated dependencies [4049ccc]
- Updated dependencies [429c41a]
- Updated dependencies [5210f18]
- Updated dependencies [cbc93e9]
- Updated dependencies [42f09c3]
- Updated dependencies [55afd8a]
  - fumadocs-core@16.0.0

## 3.0.2

### Patch Changes

- a3a14e7: Bump deps
- Updated dependencies [a3a14e7]
  - fumadocs-core@15.8.3

## 3.0.1

### Patch Changes

- 655bb46: Support custom `defaultValue` for `remark-ts2js`
- Updated dependencies [655bb46]
- Updated dependencies [d1ae3e8]
- Updated dependencies [6548a59]
- Updated dependencies [51268ec]
- Updated dependencies [51268ec]
  - fumadocs-core@15.8.0

## 3.0.0

### Major Changes

- b4474cf: `remarkTypeScriptToJavaScript` now output new `<CodeBlockTabs />` syntax, drop `Tab` and `Tabs` options
- b4474cf: Make `fumadocs-core` a required peer dep (and must be `^15.7.2`)

### Minor Changes

- b4474cf: [`remarkTypeScriptToJavaScript`] Support overriding output codeblock's meta string

### Patch Changes

- Updated dependencies [88b5a4e]
- Updated dependencies [039b24b]
- Updated dependencies [08eee2b]
  - fumadocs-core@15.7.2

## 2.1.0

### Minor Changes

- d0f8a15: Enable `remarkNpm` by default, replace `remarkInstall` with it.
- f8d1709: **Redesigned Codeblock Tabs**

  Instead of relying on `Tabs` component, it supports a dedicated tabs component for codeblocks:

  ```tsx
  <CodeBlockTabs>
    <CodeBlockTabsList>
      <CodeBlockTabsTrigger value="value">Name</CodeBlockTabsTrigger>
    </CodeBlockTabsList>
    <CodeBlockTab value="value" asChild>
      <CodeBlock>...</CodeBlock>
    </CodeBlockTab>
  </CodeBlockTabs>
  ```

  The old usage is not deprecated, you can still use them while Fumadocs' remark plugins will generate codeblock tabs using the new way.

## 2.0.1

### Patch Changes

- 1b7bc4b: Add `@types/react` to optional peer dependency to avoid version conflict in monorepos

## 2.0.0

### Major Changes

- 4642a86: **Remove `typescriptGenerator` from `fumadocs-docgen`**

  **why:** Move dedicated parts to `fumadocs-typescript`, so all docs generation features for TypeScript can be put together in a single module.

  **migrate:** Use `fumadocs-typescript` We made a new `remarkAutoTypeTable` remark plugin generating the type table but with a different syntax:

  ```mdx
  <auto-type-table path="./my-file.ts" name="MyInterface" />
  ```

  Instead of:

  ````mdx
  ```json doc-gen:typescript
  {
    "file": "./my-file.ts",
    "name": "MyInterface"
  }
  ```
  ````

- 4642a86: **Move `remarkTypeScriptToJavaScript` plugin to `fumadocs-docgen/remark-ts2js`.**

  **why:** Fix existing problems with `oxc-transform`.

  **migrate:**

  Import it like:

  ```ts
  import { remarkTypeScriptToJavaScript } from "fumadocs-docgen/remark-ts2js";
  ```

  instead of importing from `fumadocs-docgen`.

## 1.3.8

### Patch Changes

- Updated dependencies [7608f4e]
  - fumadocs-typescript@3.0.4

## 1.3.7

### Patch Changes

- 260128f: Add `remarkShow` plugin
  - fumadocs-typescript@3.0.3

## 1.3.6

### Patch Changes

- a8e9e1f: Bump deps
  - fumadocs-typescript@3.0.3

## 1.3.5

### Patch Changes

- b9601fb: Update Shiki
- Updated dependencies [b9601fb]
  - fumadocs-typescript@3.0.3

## 1.3.4

### Patch Changes

- 6d3c7d2: Use `oxc` for `ts2js` remark plugins
  - fumadocs-typescript@3.0.2

## 1.3.3

### Patch Changes

- 4ab0de6: Support TS2JS remark plugin [experimental]
  - fumadocs-typescript@3.0.2

## 1.3.2

### Patch Changes

- Updated dependencies [c042eb7]
  - fumadocs-typescript@3.0.2

## 1.3.1

### Patch Changes

- Updated dependencies [d6d290c]
  - fumadocs-typescript@3.0.1

## 1.3.0

### Minor Changes

- f9adba6: Support inline type syntax in `AutoTypeTable` `type` prop

### Patch Changes

- be820c4: Bump deps
- Updated dependencies [f9adba6]
- Updated dependencies [f9adba6]
- Updated dependencies [f9adba6]
- Updated dependencies [be820c4]
  - fumadocs-typescript@3.0.0

## 1.2.0

### Minor Changes

- 3a2c837: Improve caching

### Patch Changes

- 0c251e5: Bump deps
- Updated dependencies [0c251e5]
- Updated dependencies [3a2c837]
  - fumadocs-typescript@2.1.0

## 1.1.0

### Minor Changes

- 979896f: Support generating Tabs with `persist` enabled (Fumadocs UI only)

### Patch Changes

- fumadocs-typescript@2.0.1

## 1.0.2

### Patch Changes

- 8ef2b68: Bump deps
- Updated dependencies [8ef2b68]
  - fumadocs-typescript@2.0.1

## 1.0.1

### Patch Changes

- Updated dependencies [f75287d]
  - fumadocs-typescript@2.0.0
