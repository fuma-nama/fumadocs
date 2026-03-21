# @fumadocs/base-ui

## 16.7.3

### Patch Changes

- 9580621: fix sidebar scroll area
- 7aa66f2: Redesign home layout navigation menu
  - fumadocs-core@16.7.3

## 16.7.2

### Patch Changes

- 652c725: Simplify internal types
  - fumadocs-core@16.7.2

## 16.7.1

### Patch Changes

- 11b8691: hotfix
- 75b0b94: Refactor TOC slot
  - fumadocs-core@16.7.1

## 16.7.0

### Minor Changes

- 8bdee70: Implement renderer API for replacing layout components, deprecate old options
- bdffeba: Improved `defineI18nUI()` usage: allow language translations to be defined at root config.
- f45d703: stabilize Shiki factory API

### Patch Changes

- 3d17757: Improve `<GithubInfo />` component
- Updated dependencies [f45d703]
- Updated dependencies [45aa454]
  - fumadocs-core@16.7.0

## 16.6.17

### Patch Changes

- c3a723e: fix codeblock RSC highlighting
- Updated dependencies [c2678c0]
- Updated dependencies [417f07a]
- Updated dependencies [bb07706]
- Updated dependencies [f065406]
  - fumadocs-core@16.6.17

## 16.6.16

### Patch Changes

- Updated dependencies [054da73]
  - fumadocs-core@16.6.16

## 16.6.15

### Patch Changes

- 86d3abb: fix broken tsdown CSS logic
  - fumadocs-core@16.6.15

## 16.6.14

### Patch Changes

- a02048c: UI: override MDX types by default
- 02201df: Simplify i18n setup
- Updated dependencies [8382363]
  - fumadocs-core@16.6.14

## 16.6.13

### Patch Changes

- 2702b28: Bundle page actions into UI
  - fumadocs-core@16.6.13

## 16.6.12

### Patch Changes

- Updated dependencies [ddb0f81]
  - fumadocs-core@16.6.12

## 16.6.11

### Patch Changes

- Updated dependencies [d35f30c]
- Updated dependencies [ae3e742]
- Updated dependencies [269dfb3]
  - fumadocs-core@16.6.11

## 16.6.10

### Patch Changes

- Updated dependencies [9b5c2dd]
  - fumadocs-core@16.6.10

## 16.6.9

### Patch Changes

- 0aad574: fix: reverse sidebar chevron direction for RTL layouts

  In RTL mode, the `ChevronDown` icon in collapsed sidebar folders was
  incorrectly pointing to the right (via `-rotate-90`). Added `rtl:rotate-90`
  so the icon points to the left when the folder is collapsed, matching
  the expected RTL reading direction.

- 6a7725b: fix: use logical CSS properties in Steps component for RTL support
- 7a61fa5: Support `codeblock.rsc` API for server-side codeblocks
- Updated dependencies [4d05c4e]
- Updated dependencies [5f687b6]
  - fumadocs-core@16.6.9

## 16.6.8

### Patch Changes

- 5453502: use Shiki.js v4
- 8fc467a: fix home layout navbar
- Updated dependencies [5453502]
  - @fumadocs/tailwind@0.0.3
  - fumadocs-core@16.6.8

## 16.6.7

### Patch Changes

- 8faa2e4: fix codeblock highlight styles
  - fumadocs-core@16.6.7

## 16.6.6

### Patch Changes

- 38bd784: improve flux layout
  - fumadocs-core@16.6.6

## 16.6.5

### Patch Changes

- Updated dependencies [1a614de]
- Updated dependencies [6ab6692]
  - fumadocs-core@16.6.5

## 16.6.4

### Patch Changes

- 8f8e7f0: fix accessibility issues
  - fumadocs-core@16.6.4

## 16.6.3

### Patch Changes

- 1c26656: Extend grid of docs layout to 5 columns
  - fumadocs-core@16.6.3

## 16.6.2

### Patch Changes

- cfc5590: Implement `active` on sidebar link items
  - fumadocs-core@16.6.2

## 16.6.1

### Patch Changes

- 89c6e65: fix search dialog shortcuts
- Updated dependencies [00c9a0f]
  - fumadocs-core@16.6.1

## 16.6.0

### Minor Changes

- 9241992: **Support Markdown in search results**

  This deprecates the old `contentWithHighlights` field in search results, the highlights are marked with Markdown instead (e.g. `Hello <mark>World</mark>`).

### Patch Changes

- Updated dependencies [9241992]
- Updated dependencies [64a0057]
  - fumadocs-core@16.6.0

## 16.5.4

### Patch Changes

- Updated dependencies [1ad8a38]
- Updated dependencies [3e8efb0]
  - fumadocs-core@16.5.4

## 16.5.3

### Patch Changes

- Updated dependencies [be957f1]
  - fumadocs-core@16.5.3

## 16.5.2

### Patch Changes

- c22f6ee: bump tsdown
- Updated dependencies [c22f6ee]
  - @fumadocs/tailwind@0.0.2
  - fumadocs-core@16.5.2

## 16.5.1

### Patch Changes

- c08364a: support Flux layout
- 53ad20b: Pre-scan class names to optimize Tailwind CSS compilation performance
- Updated dependencies [db93ebd]
  - @fumadocs/tailwind@0.0.1
  - fumadocs-core@16.5.1

## 16.5.0

### Patch Changes

- 85cc22f: support `.core` exports for dynamic codeblocks, migrate to effect-based `useShiki()` to avoid limitations of `<Suspense />`.
- Updated dependencies [85cc22f]
- Updated dependencies [9ba1250]
  - @fumadocs/ui@16.5.0
  - fumadocs-core@16.5.0

## 16.4.11

### Patch Changes

- Updated dependencies [a75a84d]
  - fumadocs-core@16.4.11
  - @fumadocs/ui@16.4.11

## 16.4.10

### Patch Changes

- 430a5f1: support `on` on docs layout
- Updated dependencies [099fde7]
- Updated dependencies [6fd7e63]
  - fumadocs-core@16.4.10
  - @fumadocs/ui@16.4.10

## 16.4.9

### Patch Changes

- Updated dependencies [48dd0c2]
  - fumadocs-core@16.4.9
  - @fumadocs/ui@16.4.9

## 16.4.8

### Patch Changes

- Updated dependencies [0025484]
  - fumadocs-core@16.4.8
  - @fumadocs/ui@16.4.8

## 16.4.7

### Patch Changes

- Updated dependencies [0765817]
- Updated dependencies [5dec9d0]
  - @fumadocs/ui@16.4.7
  - fumadocs-core@16.4.7

## 16.4.6

### Patch Changes

- Updated dependencies [ea57dbf]
  - fumadocs-core@16.4.6
  - @fumadocs/ui@16.4.6

## 16.4.5

### Patch Changes

- 9f06196: fix `footer.children` props
  - fumadocs-core@16.4.5
  - @fumadocs/ui@16.4.5

## 16.4.4

### Patch Changes

- c804ac6: expose `useAutoScroll()`
- Updated dependencies [cdc97e0]
  - fumadocs-core@16.4.4
  - @fumadocs/ui@16.4.4

## 16.4.3

### Patch Changes

- 84ce624: Keep default prefetch behaviours in sidebar
- Updated dependencies [f5dcb7c]
- Updated dependencies [7e08b2f]
  - fumadocs-core@16.4.3
  - @fumadocs/ui@16.4.3

## 16.4.2

### Patch Changes

- b16a32f: Switch to tsdown for bundling
- Updated dependencies [590d36a]
- Updated dependencies [98d38ff]
- Updated dependencies [446631d]
- Updated dependencies [b16a32f]
  - fumadocs-core@16.4.2
  - @fumadocs/ui@16.4.2

## 16.4.1

### Patch Changes

- Updated dependencies [0a3adb8]
  - @fumadocs/ui@16.4.1
  - fumadocs-core@16.4.1

## 16.4.0

### Patch Changes

- da98fe2: Support `onSelect` prop in `<SearchDialog />` component
- Updated dependencies [a3b7919]
  - fumadocs-core@16.4.0
  - @fumadocs/ui@16.4.0

## 16.3.2

### Patch Changes

- 7c78045: Support custom renderer for `title` in layouts
  - @fumadocs/ui@16.3.2
  - fumadocs-core@16.3.2

## 16.3.1

### Patch Changes

- f398e36: Improve sidebar dropdown
  - fumadocs-core@16.3.1
  - @fumadocs/ui@16.3.1

## 16.3.0

### Minor Changes

- a69b060: Support both Base UI and Radix UI as base component libraries

### Patch Changes

- Updated dependencies [a69b060]
  - fumadocs-core@16.3.0
  - @fumadocs/ui@16.3.0
