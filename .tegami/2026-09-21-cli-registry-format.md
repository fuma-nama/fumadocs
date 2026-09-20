---
packages:
  npm:@fumadocs/cli: minor
  npm:create-fumadocs-app: patch
---

## New registry format

The CLI is upgraded to Fuma CLI 0.3, the registry is now a manifest with the raw files instead of one JSON per component.

- Installing fetches every needed file in parallel, and no longer parses the installed files to link their imports.
- Layouts are imported from `fumadocs-ui` unless you have installed them, without a Fumadocs-specific plugin.

Older versions of the CLI cannot read the new registry, upgrade to install components.

### Moved files

Some components are installed to a location that follows their source, update your imports if you install them again:

| Before                                                                          | Now                                             |
| ------------------------------------------------------------------------------- | ----------------------------------------------- |
| `components/sanity/<name>.tsx`                                                  | `components/sanity/<name>.component.tsx`        |
| `components/docs-sidebar/tabs-dropdown.tsx`                                     | `components/docs-sidebar/tabs/dropdown.tsx`     |
| `components/openapi/playground/{result-display,server-select,oauth-dialog}.tsx` | `components/openapi/playground/components/*`    |
| `components/graphql/playground/code-editor.tsx`                                 | `components/graphql/components/code-editor.tsx` |

### Names of layout slots

Slots are named after their path, like `layouts/docs/slots/sidebar` instead of `slots/docs/sidebar`. `fumadocs customise` is unchanged.
