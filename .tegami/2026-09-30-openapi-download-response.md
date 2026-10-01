---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/language': patch
---

### Download response bodies from the playground

The result panel of the API playground has a **Download** button for non-empty responses. The file is named from the `Content-Disposition` header, preferring `filename*` and without directories, otherwise `response`, which browsers complete with the extension of the media type.

For the browser to read `Content-Disposition`, cross-origin APIs have to list it in `Access-Control-Expose-Headers`, or be requested through the proxy.

Fix [#3625](https://github.com/fuma-nama/fumadocs/issues/3625)
