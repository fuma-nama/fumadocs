---
packages:
  npm:@fumadocs/cli: patch
---

## Shorter names for integration components

The components of integrations dropped their `fumadocs/` prefix:

```npm
npx @fumadocs/cli add openapi/page
```

| Before                | Now          |
| --------------------- | ------------ |
| `fumadocs/openapi/*`  | `openapi/*`  |
| `fumadocs/asyncapi/*` | `asyncapi/*` |
| `fumadocs/graphql/*`  | `graphql/*`  |
| `fumadocs/story/*`    | `story/*`    |
| `fumadocs/sanity/*`   | `sanity/*`   |
| `fumadocs/api-docs/*` | `api-docs/*` |

The old names are gone, update the commands in your scripts. `fumadocs/base-ui` and `fumadocs/radix-ui` are unchanged, the CLI resolves them from your configured `uiLibrary`.
