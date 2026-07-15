## @fumadocs/language@0.2.1

### Expose sidebar trigger state to assistive technology

`SidebarTrigger` now sets `aria-expanded` and `aria-controls`, and its label changes between `Open Sidebar` and `Close Sidebar` depending on the state.

Previously, both the button opening the mobile sidebar and the one closing it were named `Open Sidebar`, and neither conveyed whether the sidebar was open.

A new `Close Sidebar` translation key is available for customisation.

## @fumadocs/language@0.2.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

# @fumadocs/language

## 0.1.0

### Minor Changes

- 779efff: **Introduce new translations API**

  It is now powered by `fuma-translate`. Be careful: while the API surface is same, some translation keys are changed, unused labels will be ignored.

### Patch Changes

- Updated dependencies [9b9545f]
- Updated dependencies [f027706]
- Updated dependencies [0cc1fac]
- Updated dependencies [74102c5]
- Updated dependencies [779efff]
  - fumadocs-core@16.10.0
  - fumadocs-openapi@11.0.0
  - fumadocs-ui@16.10.0
  - @fumadocs/asyncapi@0.0.1
  - @fumadocs/story@1.1.0
