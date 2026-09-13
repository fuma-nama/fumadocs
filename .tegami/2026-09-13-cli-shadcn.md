---
packages:
  npm:@fumadocs/cli: patch
---

## Reuse your Shadcn UI components

On projects with a `components.json`, the CLI leaves the `button`, `popover` and `collapsible` of your `ui` directory as they are and imports them from installed components, they share the API of Shadcn UI. `cn` is imported from your `utils` alias instead of a new `lib/cn.ts`, configurable in `cli.json`:

```json
{
  "aliases": {
    "utils": "./lib/utils"
  }
}
```

Fumadocs' copies are only installed when you don't have them yet. The `tabs` and `accordion` primitives are Fumadocs specific, they are installed next to their components instead of the `ui` directory.

- `customize` updates the imports of your route files to the installed layouts.
- `feature ai` and `feature feedback` install the primitives of your configured `uiLibrary`, they always used the Radix UI ones before.
