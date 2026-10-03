---
packages:
  'fumadocs-openapi': minor
  '@fumadocs/language': patch
---

### Redesigned API playground

The playground moves into a dialog, opened from **Try in Playground** on the endpoint bar of API pages.

- The URL bar selects the server, edits its variables, and fills path parameters inline.
- Auth, parameters and the request body are edited in one panel, one row per field with its type in the input. Descriptions and constraints like ranges and defaults open from the info button next to the field name.
- Nested objects and arrays open in their own panel, navigated with breadcrumbs. The current breadcrumb switches between the nested fields of its parent, and the body can be edited as JSON.
- OAuth 2.0 authorization opens in the same panel instead of a nested dialog, with the flow, client credentials and scopes to request. When a flow redirects to authorize, the playground reopens with the token once it returns to the page.
- The response shows beside the code usages with its status, duration, size and headers. Until a request is sent, the documented response examples are shown instead.
- Send requests with <kbd>Cmd/Ctrl</kbd> + <kbd>Enter</kbd>.

`components.CollapsiblePanel` of the playground options is removed, with the `DefaultCollapsiblePanel` and `CollapsiblePanelProps` exports of `fumadocs-openapi/ui/playground/client`.

Extra props of `<PlaygroundClient />` like `className` now go to its endpoint bar instead of a form, so form props like `onSubmit` are no longer accepted.
