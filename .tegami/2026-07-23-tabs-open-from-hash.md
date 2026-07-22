---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## Open the tab containing a linked heading

When a tab's content stays mounted (`forceMount` / `keepMounted`), navigating to a URL hash that points to an element inside a tab — such as a Table of Contents link to a heading — now opens the tab it belongs to and scrolls to the target. This runs on both initial load and `hashchange`.
