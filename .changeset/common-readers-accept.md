---
'fumadocs-core': major
---

**Remove `fumadocs-core/sidebar` API**

why: no longer used by Fumadocs UI, and the abstraction isn't good enough.

migrate: The original component is mostly a wrapper of `react-remove-scroll`, you can use Shadcn UI for pre-built sidebars. 
