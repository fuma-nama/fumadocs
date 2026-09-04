---
packages:
  npm:fumadocs-ui: patch
  npm:@fumadocs/base-ui: patch
---

## Fix Tabs reverting to the hash target after a tab click

The hash-to-tab logic of `Tabs` ran on every render instead of only on mount and `hashchange`, because the effect depended on a `useEffectEvent` callback, which is not referentially stable.
