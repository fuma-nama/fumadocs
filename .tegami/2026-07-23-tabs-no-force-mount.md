---
packages:
  npm:fumadocs-ui: minor
  npm:@fumadocs/base-ui: minor
---

## Don't force-mount inactive tab content by default

Styled `Tabs` previously kept every tab panel mounted in the DOM (hidden with `display: none`). Inactive panels are now unmounted by default, following the underlying primitive.

You can still opt back into keeping panels mounted per tab with `forceMount` (`fumadocs-ui`) or `keepMounted` (`@fumadocs/base-ui`) on `Tab` / `TabsContent`.
