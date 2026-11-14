---
packages:
  'fumadocs-core': patch
---

### `usePathname()` During TanStack Router Navigations

- Components that mount or hydrate while TanStack Router loads the next page get the pathname of the current page, like the components that were already mounted, instead of the next page's.
