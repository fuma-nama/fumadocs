---
packages:
  'fumadocs-openapi': patch
---

### Render request bodies of unsupported media types read-only

A request body with a media type that has no adapter no longer throws. It is shown as usual, left out of code usages, and cannot be sent from the playground.

`text/plain` with parameters, like `text/plain; charset=utf-8`, is also handled like `text/plain`.

`isMediaTypeSupported()` is removed, use `resolveMediaAdapter()` instead.

Fix [#3615](https://github.com/fuma-nama/fumadocs/issues/3615)
