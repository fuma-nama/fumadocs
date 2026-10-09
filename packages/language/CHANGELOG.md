## @fumadocs/language@0.2.11

### Fix images in descriptions, show the OAuth redirect URI

- Images in Markdown of API pages, like the description of an operation, and in descriptions of `<AutoTypeTable />` props no longer crash the page with "Element type is invalid".
- The OAuth panel of the playground shows the `redirect_uri` of the authorization code and implicit flows, with a button to copy it: the `oauthRedirectUrl` route when set, otherwise the current page.
- The Authorize row of OAuth schemes in the playground is one button, filling the row.

Fix [#3661](https://github.com/fuma-nama/fumadocs/issues/3661), [#3663](https://github.com/fuma-nama/fumadocs/issues/3663)

## @fumadocs/language@0.2.10

### Schema UI in cards

Nested schemas open in a card instead of a popover, navigated with breadcrumbs on top of it. Request bodies and responses render in the card directly, a property opens its card below itself.

- Panels slide in from the side they are navigated to, the page scrolls back to the breadcrumbs after navigating.
- Breadcrumbs that don't fit collapse into a menu, keeping the first crumb and the ones closest to the current schema.
- The union selector moves next to the breadcrumbs, the filter into the top of the card. In narrow cards, the filter takes a row of its own.
- Rows are more compact, enum values and constraints are shown as tags.
- The Schema UI client props accept `selector`, shown above the breadcrumbs, and `actions`, shown next to the filter.

On API pages:

- The media type of request bodies and responses is selected in the top of their cards.
- Authorization fields start with where they are sent, like `header` or `query`. The security requirement is selected in the top of their card.
- Parameters and authorization are grouped in cards.
- Responses are tabs of their status codes instead of accordions, a link to a response selects its tab and scrolls to it.
- Callbacks open in a dialog instead of expanding in the page, with their full URL on top.
- Runtime expressions in routes, like `{$request.body#/url}`, are highlighted as a whole.
- TypeScript definitions are copied from a button in the top of the body and response cards.

## @fumadocs/language@0.2.9

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

### Introduce Spacious Layout

A less compact version of Docs Layout, the page sits in an inset panel beside the sidebar, with page-level actions at the top of the panel.

- Use it from `fumadocs-ui/layouts/spacious` and `fumadocs-ui/layouts/spacious/page`, and import the styles from `fumadocs-ui/css/generated/spacious.css`.
- Pass `aiChat.panel` to render your AI chat in the layout, docked beside the page on wide screens and floating over it on smaller ones.
- Customize it with `npx @fumadocs/cli customize`, only available for Base UI.

The Chinese presets of `@fumadocs/language` include translations for its new strings.

## @fumadocs/language@0.2.8

### Download response bodies from the playground

The result panel of the API playground has a **Download** button for non-empty responses. The file is named from the `Content-Disposition` header, preferring `filename*` and without directories, otherwise `response`, which browsers complete with the extension of the media type.

For the browser to read `Content-Disposition`, cross-origin APIs have to list it in `Access-Control-Expose-Headers`, or be requested through the proxy.

Fix [#3625](https://github.com/fuma-nama/fumadocs/issues/3625)

## @fumadocs/language@0.2.7

### Name schema property link buttons for screen readers

Give the icon-only property link button a translated label and announce when its link has been copied.
Include Simplified and Traditional Chinese translations for both labels.

## @fumadocs/language@0.2.6

### Announce copy confirmation to screen readers

Copy buttons are polite live regions whose label switches to "Copied" after a successful copy, so screen readers announce it. The code block's copy button no longer reports success when the clipboard write fails.

## @fumadocs/language@0.2.5

### Mark packages side-effect free

All packages now declare `sideEffects` in `package.json`, so bundlers can tree-shake unused modules. Packages shipping stylesheets list them as side effects to keep CSS imports.

## @fumadocs/language@0.2.4

### Support HTTP Basic client authentication in OAuth password flow

Some OAuth servers require client credentials in an HTTP Basic `Authorization` header instead of the request body. The password flow dialog now offers a Client Authentication select to choose between the two methods, as described in [RFC 6749, section 2.3.1](https://www.rfc-editor.org/rfc/rfc6749#section-2.3.1).

Fix [#3506](https://github.com/fuma-nama/fumadocs/issues/3506)

## @fumadocs/language@0.2.3

### Enhance result display of API playground

The response panel now gives you the full picture of a request:

- the resolved request URL, including path and query parameters
- response headers in a collapsible list
- response body labeled with its content type

Client-side errors also show the request URL, making issues like a wrong server URL easy to spot.

For custom `ResultDisplay` components, `FetchResult` now carries a `url` field.

`@fumadocs/language` includes translations for the new UI.

## @fumadocs/language@0.2.2

### Add new translation keys

## @fumadocs/language@0.2.1

### Expose sidebar trigger state to assistive technology

`SidebarTrigger` now sets `aria-expanded` and `aria-controls`, and its label changes between `Open Sidebar` and `Close Sidebar` depending on the state.

Previously, both the button opening the mobile sidebar and the one closing it were named `Open Sidebar`, and neither conveyed whether the sidebar was open.

A new `Close Sidebar` translation key is available for customisation.

## @fumadocs/language@0.2.0

### Default to Base UI

Internal packages & templates now use Base UI rather than Radix UI.

# @fumadocs/language

## 0.1.0

### Minor Changes

- 779efff: **Introduce new translations API**

  It is now powered by `fuma-translate`. Be careful: while the API surface is same, some translation keys are changed, unused labels will be ignored.

### Patch Changes

- Updated dependencies [9b9545f]
- Updated dependencies [f027706]
- Updated dependencies [0cc1fac]
- Updated dependencies [74102c5]
- Updated dependencies [779efff]
  - fumadocs-core@16.10.0
  - fumadocs-openapi@11.0.0
  - fumadocs-ui@16.10.0
  - @fumadocs/asyncapi@0.0.1
  - @fumadocs/story@1.1.0
