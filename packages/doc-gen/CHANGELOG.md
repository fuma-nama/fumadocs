# fumadocs-docgen

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
  import { remarkTypeScriptToJavaScript } from 'fumadocs-docgen/remark-ts2js';
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
