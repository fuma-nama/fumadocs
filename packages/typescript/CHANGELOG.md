# fumadocs-typescript

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
