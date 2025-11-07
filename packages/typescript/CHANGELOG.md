# fumadocs-typescript

## 4.0.13

### Patch Changes

- ca09b6a: Core: Support accessing MDX plugins separately at `fumadocs-core/mdx-plugins/*`
- Updated dependencies [bc97236]
- Updated dependencies [ca09b6a]
- Updated dependencies [c0df2c4]
- Updated dependencies [117ad86]
  - fumadocs-core@16.0.8
  - fumadocs-ui@16.0.8

## 4.0.12

### Patch Changes

- 5210f18: Support Fumadocs 16 in `peerDependencies`.
- Updated dependencies [1494340]
- Updated dependencies [230c6bf]
- Updated dependencies [851897c]
- Updated dependencies [de0ce6d]
- Updated dependencies [4049ccc]
- Updated dependencies [0ed0ca6]
- Updated dependencies [429c41a]
- Updated dependencies [5210f18]
- Updated dependencies [cbc93e9]
- Updated dependencies [42f09c3]
- Updated dependencies [55afd8a]
- Updated dependencies [5966e23]
  - fumadocs-ui@16.0.0
  - fumadocs-core@16.0.0

## 4.0.11

### Patch Changes

- a3a14e7: Bump deps
- Updated dependencies [a3a14e7]
- Updated dependencies [7b0d839]
  - fumadocs-core@15.8.3
  - fumadocs-ui@15.8.3

## 4.0.10

### Patch Changes

- e0cfcdc: Improve simple type generation
- Updated dependencies [90cf1fe]
- Updated dependencies [ad9a004]
- Updated dependencies [90cf1fe]
- Updated dependencies [6c3bde5]
- Updated dependencies [747bdbc]
  - fumadocs-ui@15.8.2
  - fumadocs-core@15.8.2

## 4.0.9

### Patch Changes

- 43cbf32: Fix `@remarks` used for full instead of simplified type form
- Updated dependencies [655bb46]
- Updated dependencies [53a0635]
- Updated dependencies [d1ae3e8]
- Updated dependencies [6548a59]
- Updated dependencies [51268ec]
- Updated dependencies [51268ec]
  - fumadocs-core@15.8.0
  - fumadocs-ui@15.8.0

## 4.0.8

### Patch Changes

- 0d55667: Enforce `peerDeps` on Fumadocs deps
- Updated dependencies [c948f59]
  - fumadocs-core@15.7.10
  - fumadocs-ui@15.7.10

## 4.0.7

### Patch Changes

- 45c7531: Type Table: Support displaying parameters & return types
- 4082acc: Redesign Type Table

## 4.0.6

### Patch Changes

- 1b7bc4b: Add `@types/react` to optional peer dependency to avoid version conflict in monorepos

## 4.0.5

### Patch Changes

- a6c909b: Removed unused devDependencies and migrated from `fast-glob` to `tinyglobby`

## 4.0.4

### Patch Changes

- 6b04eed: Fix errors on special keys
- a1f3273: Lazy load compiler instance

## 4.0.3

### Patch Changes

- 3a5595a: Support deprecated properties in Type Table

## 4.0.2

### Patch Changes

- 38117c1: add `null | undefined` to optional props in a object type

## 4.0.1

### Patch Changes

- f67d20f: Fix `remark-auto-type-table` doesn't render `required` property

## 4.0.0

### Major Changes

- b83d946: **Use `createGenerator` API**

  Create a generator instance:

  ```ts
  import { createGenerator } from 'fumadocs-typescript';

  const generator = createGenerator(tsconfig);
  ```

  Refactor:

  ```tsx
  import { remarkAutoTypeTable, createTypeTable } from 'fumadocs-typescript';

  generateDocumentation('./file.ts', 'MyClass', fs.readFileSync('./file.ts').toString())
  generateMDX('content', {...})
  generateFiles({...})
  const processor = createProcessor({
      remarkPlugins: [remarkAutoTypeTable],
  });

  const AutoTypeTable = createTypeTable()
  return <AutoTypeTable {...props} />
  ```

  To:

  ```tsx
  import { AutoTypeTable, remarkAutoTypeTable } from "fumadocs-typescript";

  generator.generateDocumentation({path: './file.ts'}, 'MyClass')
  generateMDX(generator, 'content', { ... })
  generateFiles(generator, { ... })
  const processor = createProcessor({
      remarkPlugins: [
          [remarkAutoTypeTable, { generator }],
      ],
  });

  return <AutoTypeTable generator={generator} {...props} />
  ```

  This ensure the compiler instance is always re-used.

## 3.1.0

### Minor Changes

- 42d68a6: Support `remarkAutoTypeTable` plugin, deprecate MDX generator in favour of new remark plugin

### Patch Changes

- 5d0dd11: Support overriding `renderMarkdown` function

## 3.0.4

### Patch Changes

- 7608f4e: Support showing optional properties on TypeTable

## 3.0.3

### Patch Changes

- b9601fb: Update Shiki

## 3.0.2

### Patch Changes

- c042eb7: Fix private class members

## 3.0.1

### Patch Changes

- d6d290c: Upgrade Shiki

## 3.0.0

### Major Changes

- f9adba6: Return an array of doc entry in `generateDocumentation`

### Minor Changes

- f9adba6: Support inline type syntax in `AutoTypeTable` `type` prop
- f9adba6: Support `createTypeTable` for shared project instance

### Patch Changes

- be820c4: Bump deps

## 2.1.0

### Minor Changes

- 3a2c837: Disable cache on program-level

### Patch Changes

- 0c251e5: Bump deps

## 2.0.1

### Patch Changes

- 8ef2b68: Bump deps

## 2.0.0

### Major Changes

- f75287d: **Introduce `fumadocs-docgen` package.**

  Offer a better authoring experience for advanced use cases.
  - Move `remark-dynamic-content` and `remark-install` plugins to the new package `fumadocs-docgen`.
  - Support Typescript generator by default

  **Usage**

  Add the `remarkDocGen` plugin to your remark plugins.

  ```ts
  import { remarkDocGen, fileGenerator } from 'fumadocs-docgen';

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
  import { remarkInstall } from 'fumadocs-docgen';
  ```

## 1.0.2

### Patch Changes

- 77b5b70: Fix compatibility problems with Typescript 5.4.3

## 1.0.1

### Patch Changes

- f4aa6b6: Ignore fields marked with `@internal` tag

## 1.0.0

### Major Changes

- 321d1e1f: Support markdown in type description

### Minor Changes

- 722c2d6e: Support generating MDX files
