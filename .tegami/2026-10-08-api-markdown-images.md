---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
  'fumadocs-typescript': patch
  '@fumadocs/language': patch
---

### Fix images in descriptions, show the OAuth redirect URI

- Images in Markdown of API pages, like the description of an operation, and in descriptions of `<AutoTypeTable />` props no longer crash the page with "Element type is invalid".
- The OAuth panel of the playground shows the `redirect_uri` of the authorization code and implicit flows, with a button to copy it: the `oauthRedirectUrl` route when set, otherwise the current page.
- The Authorize row of OAuth schemes in the playground is one button, filling the row.

Fix [#3661](https://github.com/fuma-nama/fumadocs/issues/3661), [#3663](https://github.com/fuma-nama/fumadocs/issues/3663)
