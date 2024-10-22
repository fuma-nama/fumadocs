# fumadocs-twoslash

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
