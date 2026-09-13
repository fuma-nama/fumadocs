---
packages:
  npm:fumadocs-ui: minor
  npm:@fumadocs/base-ui: minor
---

## Shadcn UI compatible primitives

The primitives in `fumadocs-ui/components/ui/*` now follow the API of Shadcn UI, so components installed by the CLI can use the ones you already have.

`buttonVariants` accepts the `default` variant of Shadcn UI:

```tsx
buttonVariants({ variant: 'default', size: 'sm' });
```

`primary` and the `color` alias still work.

`fumadocs-ui/components/ui/scroll-area` is removed, the sidebars render the scroll area primitives directly.
