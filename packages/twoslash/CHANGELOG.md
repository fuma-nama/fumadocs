# fumadocs-twoslash

## 3.1.1

### Patch Changes

- 085e39f: Fix inline code issues
- Updated dependencies [eb18da9]
- Updated dependencies [085e39f]
- Updated dependencies [4d50bcf]
  - fumadocs-ui@15.2.7

## 3.1.0

### Minor Changes

- b49d236: Support `typesCache` option and `fumadocs-twoslash/cache-fs` similar to Vitepress

### Patch Changes

- Updated dependencies [6bc033a]
  - fumadocs-ui@15.0.14

## 3.0.1

### Patch Changes

- 0f59dfc: Update peer deps
- Updated dependencies [7608f4e]
- Updated dependencies [89ff3ae]
- Updated dependencies [16c8944]
  - fumadocs-ui@15.0.13

## 3.0.0

### Major Changes

- a89d6e0: Require Fumadocs v15 & Tailwind CSS v4

### Patch Changes

- Updated dependencies [a89d6e0]
- Updated dependencies [a84f37a]
- Updated dependencies [f2f9c3d]
  - fumadocs-ui@15.0.0

## 2.0.3

### Patch Changes

- b9601fb: Update Shiki
  - fumadocs-ui@14.7.6

## 2.0.2

### Patch Changes

- 9585561: Fix Twoslash popups focus outline
- 4766292: Support React 19
- Updated dependencies [010da9e]
- Updated dependencies [bebb16b]
- Updated dependencies [9585561]
- Updated dependencies [4766292]
  - fumadocs-ui@14.6.0

## 2.0.1

### Patch Changes

- d6d290c: Upgrade Shiki
  - fumadocs-ui@14.1.0

## 2.0.0

### Major Changes

- 9a10262: **Move Twoslash UI components to `fumadocs-twoslash`**

  **why:** Isolate logic from Fumadocs UI

  **migrate:**

  Before:

  ```ts
  import 'fumadocs-ui/twoslash.css';

  import { Popup } from 'fumadocs-ui/twoslash/popup';
  ```

  After:

  ```ts
  import 'fumadocs-twoslash/twoslash.css';

  import { Popup } from 'fumadocs-twoslash/ui';
  ```

  **Tailwind CSS is now required for Twoslash integration.**

### Patch Changes

- be820c4: Bump deps
- Updated dependencies [34cf456]
- Updated dependencies [d9e908e]
- Updated dependencies [f949520]
- Updated dependencies [ad47fd8]
- Updated dependencies [d9e908e]
- Updated dependencies [367f4c3]
- Updated dependencies [87063eb]
- Updated dependencies [64f0653]
- Updated dependencies [e1ee822]
- Updated dependencies [d9e908e]
- Updated dependencies [d9e908e]
- Updated dependencies [e612f2a]
- Updated dependencies [3d0369a]
- Updated dependencies [9a10262]
- Updated dependencies [d9e908e]
- Updated dependencies [3d054a8]
- Updated dependencies [d9e908e]
- Updated dependencies [be820c4]
- Updated dependencies [be53a0e]
  - fumadocs-ui@14.0.0

## 1.1.3

### Patch Changes

- 0c251e5: Bump deps
- Updated dependencies [0c251e5]
- Updated dependencies [0c251e5]
- Updated dependencies [0c251e5]
  - fumadocs-ui@13.4.2

## 1.1.2

### Patch Changes

- 2cc477f: Fix meta field inherited to child code blocks
- Updated dependencies [8f5b19e]
- Updated dependencies [32ca37a]
- Updated dependencies [9aae448]
- Updated dependencies [c542561]
  - fumadocs-ui@13.3.0

## 1.1.1

### Patch Changes

- 6ed95ea: Fix compatibility issues with Fumadocs UI v13
- Updated dependencies [89190ae]
- Updated dependencies [b02eebf]
- Updated dependencies [f868018]
- Updated dependencies [8aebeab]
- Updated dependencies [c684c00]
- Updated dependencies [8aebeab]
- Updated dependencies [0377bb4]
- Updated dependencies [e8e6a17]
- Updated dependencies [c8964d3]
- Updated dependencies [c901e6b]
- Updated dependencies [daa7d3c]
- Updated dependencies [89190ae]
- Updated dependencies [b02eebf]
- Updated dependencies [4373231]
  - fumadocs-ui@13.0.0

## 1.1.0

### Minor Changes

- 5f86faa: Improve multi-line code blocks

## 1.0.3

### Patch Changes

- 8ef2b68: Bump deps

## 1.0.2

### Patch Changes

- 08e4904: Update types

## 1.0.1

### Patch Changes

- c71b7e3: Ignore injected elements when copying code
