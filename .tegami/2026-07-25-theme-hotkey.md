---
packages:
  npm:fumadocs-ui: minor
  npm:@fumadocs/base-ui: minor
---

## Add hotkey for toggling light/dark mode

Press <kbd>D</kbd> to toggle between light and dark mode. It is ignored while typing in an editable element or when a dialog (e.g. search) is opened.

Customise it with the `theme.hotKey` option of `<RootProvider />`, or pass `false` to disable.
