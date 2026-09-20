---
packages:
  npm:fumadocs-openapi: patch
---

## Fix the installed API playground

The playground installed by `npx @fumadocs/cli add openapi/playground` imported `useAuthFields`, `requestOAuthToken` and their types from `fumadocs-openapi/playground`, which did not export them. They are now exported.
