---
name: radix-base-ui-sync
description: Keep packages/radix-ui (fumadocs-ui) and packages/base-ui in sync. Use when editing either package, adding features, or fixing bugs so both UI variants stay consistent.
---

# Radix UI vs Base UI Package Sync

`packages/radix-ui` (fumadocs-ui) and `packages/base-ui` (@fumadocs/base-ui) are two variants of Fumadocs UI. They share the same layout structure, components, and public API; only the underlying primitives differ. When changing one package, consider the other.

## Package identity

|                  | radix-ui                | base-ui                |
| ---------------- | ----------------------- | ---------------------- |
| **Package name** | `fumadocs-ui`           | `@fumadocs/base-ui`    |
| **Primitives**   | `@radix-ui/*`           | `@base-ui/react`       |
| **Config key**   | `uiLibrary: 'radix-ui'` | `uiLibrary: 'base-ui'` |

## What to keep in sync

- **Layouts**: `layouts/docs`, `layouts/flux`, `layouts/home`, `layouts/notebook`, `layouts/shared` — structure and props should match; only primitive usage differs.
- **Components**: Same public API and behavior for components under `components/` (e.g. toc, steps, sidebar/page-tree, dialog/search behavior). UI primitives in `components/ui/` differ by design.
- **Provider**: `provider/base.tsx` — same props; only `DirectionProvider` and search/dialog primitives differ.
- **Contexts, utils, i18n, mdx, og**: Should stay identical or nearly identical.
- **package.json**: Same `exports` shape and version; `dependencies` differ (Radix vs Base UI).
