## @fumadocs/language@0.2.18

### Unions of `const` members and `string` suggest their values

- In the playground, a `oneOf`/`anyOf` of `const` strings and `string` is one input that suggests the `const` members, labelled by their `title` and filtered as you type, while it still takes any string, instead of a switch between members.

## @fumadocs/language@0.2.17

### Names of OpenAPI selects

- Add Chinese translations for the names of the selects on operation pages and union schemas.

## @fumadocs/language@0.2.16

### Redesigned GraphQL pages

- Operation pages start with their signature and directives, like `QUERY customer(id: ID!): Customer`, and keep the types they use in place: arguments and return types open in Schema UI panels.
- Pages of named types are opt-in with `includeTypes`, they show the SDL of types and where they are used.
- Example requests and responses beside operations, with a select of examples and code samples in cURL, JavaScript, Go, Python, Java, C# and Rust.
- Named examples from GraphQL documents with the `examples` option of `createGraphQL()`.
- The playground opens in a dialog: an editor with validation and formatting, variables as a form or JSON, headers, and responses with their GraphQL errors.
- The playground runs subscriptions over graphql-ws or GraphQL over SSE (`subscriptionUrl`), and logs their events.
- Directives applied in the schema show their definitions, `@oneOf` input objects are supported.
- `getText()` returns pages in Markdown for LLMs, operations with the SDL of types they use.
- Chinese translations of GraphQL pages in `@fumadocs/language`.

### API changes

| Before                                                                  | Now                                                        |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| pages of named types by default                                         | `includeTypes: true`, also for `per: 'file'`               |
| `useOperation().example`                                                | `examples`, with `selected` and `select()`                 |
| `slots.relations` and `slots.scalar` of `renderTypeLayout`              | `slots.definition`, `usages` and `sdl`                     |
| `@fumadocs/graphql/utils/snippets`                                      | the `codeUsages` option                                    |
| `inputTypeToJsonSchema(type, depth)`                                    | `inputTypeToJsonSchema(type)`, recursive inputs are shared |
| `slots.directives` of `renderOperationLayout` and `renderTypeLayout`    | in `slots.playground` and `slots.definition`               |
| `renderArguments` of `generateGraphQLSchemaUI()`, `SchemaViewRoot.args` | arguments open in their own panel                          |

- Added `createCodeUsageGeneratorRegistry()` and `registerDefaultCodeUsages()` to `@fumadocs/graphql/ui`.
- Added `usePlayground()`, `useRequestValues()` and `subscribeGraphQL()` to `@fumadocs/graphql/playground`, the installed playground runs on them.
- Removed `HeaderItem`, `filterHeaderItems()`, `readStored()`, `writeStored()`, `getEndpointOrigin()` and `syncOperationVariables()` from `@fumadocs/graphql/playground`, `usePlayground()` keeps headers by endpoint origin.
- Added `relations.unions` to `useNamedType()`.
- The Schema UI root also takes a schema coordinate, like `Query.orders()` for the arguments of `Query.orders`.

## @fumadocs/language@0.2.15

### Redesigned AsyncAPI pages

- Messages are labelled **Receive** and **Send** for readers, instead of the `send` and `receive` of the documented application, the sidebar shows them as icons.
- A connection bar shows the channel address with the server below it, brokers label the address as a topic, queue or subject.
- Messages are listed in an accordion, their examples beside the payload and headers on wide pages.
- Example cards are titled with the name and summary of examples, selects switch to other examples and to their headers.
- Protocol details only show the bindings of the selected server, `x-*` bindings are hidden.
- A playground connects to channels, sends messages from their examples and identifies the received ones.
- The playground edits address parameters in its URL and previews the URL to connect.
- Code samples beside operations in JavaScript and Python for WebSocket, MQTT, Kafka, AMQP and NATS servers, and from `x-codeSamples` of operations.
- Playground transports connect by protocol: WebSocket is built in, `sseTransport` receives Server-Sent Events.
- The playground sends text, hex and Base64 messages, and previews binary ones in hex.
- Security schemes show OAuth 2.0 flows, scopes and SASL mechanisms.
- Avro, Protobuf and RAML schemas are shown as they are.

### Fixes

- Later traits override earlier ones, as the spec merges them in order.
- `defaultContentType` applies to messages without `contentType`.
- `per: 'tag'` matches tags by name, operations without tags are under `unknown`.
- `groupBy: 'channel'` names folders by channel keys and files by operation ids.
- Channels with empty `servers` are available on all servers.
- Operations sharing a title on one page get unique anchors.
- AsyncAPI 2 documents throw an error instead of generating no pages.
- `imports: []` no longer adds an empty line to generated files.
- Operations show the description of their channel, it is in search and Markdown too.
- `readOnly` properties are hidden from messages readers send and `writeOnly` ones from messages they receive, in schemas, TypeScript types and generated examples, instead of both from all messages.

### API changes

| Before                                                          | Now                                 |
| --------------------------------------------------------------- | ----------------------------------- |
| `slots.server` and `slots.channel` of `renderOperationLayout`   | `slots.connection`                  |
| `content.renderAPIExampleUsageTabs`                             | removed, examples are in messages   |
| `useOperationSecurity()` returns schemes of operation or server | `{ server, operation }`, both apply |
| `payload` and `headers` of `OperationMessage` are schemas       | `{ schema, schemaFormat? }`         |
| `OperationReply.messages` have `title` and `payload`            | `OperationMessage[]`                |
| `action` prop of `<Operation />` and `<OperationProvider />`    | removed, read from the operation    |
| `preloaded.proxyUrl` of `AsyncAPIPageProps_Preloaded`           | removed, it was never used          |
| `meta.groupStyle` of `generateFiles()`                          | removed, use `folderStyle`          |

- Added the `playground` option of `createAsyncAPIPage()` with `transports`, and `usePlayground()`, `usePlaygroundTransport()` and `sseTransport` from `@fumadocs/asyncapi/playground`.
- Added the `generateTypeScriptDefinitions` option, payloads and headers can be copied as TypeScript types.
- Added the `codeUsages` option and `slots.usage` of `renderOperationLayout`, with `createCodeUsageGeneratorRegistry()` and `registerDefaultCodeUsages()` from `@fumadocs/asyncapi/ui`.
- Added `getText()` to the data of AsyncAPI pages, their operations in Markdown for LLMs.
- Added `received` to `OperationMessage`, whether readers receive the message.

## @fumadocs/language@0.2.14

### All security schemes in the API playground

- Support OAuth 2.0 `deviceAuthorization` flows, `openIdConnect` schemes and PKCE.
- OAuth requests with a client secret and device flows go through `proxyUrl` when set, allow your authorization server in `allowedOrigins`.
- The OAuth panel remembers the client ID.
- `mutualTLS` schemes no longer send an `Authorization` header.
- Headless: `useOpenIdConnectFlows()`, `stf` and `returned` of `usePlaygroundAuth()`, `requestOAuthToken()` accepts `onUserCode`, `signal` and `proxyUrl`.
- Playgrounds on a page share their auth values, `useAuthFields().mapValues()` reads them from the page.
- The playground reopens after OAuth flows return in client-rendered sites.
- Returning OAuth flows no longer switch the security requirement of other playgrounds.
- Added translation keys to `@fumadocs/language`.

### Redesign the example request and response

- Titled cards with selects instead of tabs, for the language, the response status and the examples of webhooks.
- A Schema switch shows the JSON Schema of example responses.
- Webhook examples show their body and parameters in sections instead of accordions.
- The playground shows its code usages under a Request header, in the language selected on the page.
- The playground shows response descriptions in full, in the Response header.
- Added translation keys to `@fumadocs/language`.

## @fumadocs/language@0.2.13

### Lightbox for zoomable images

Zoomable images inside `<Lightbox />` open in one viewer, browse them with arrow keys, swipes or the side buttons.

```tsx
import { Lightbox } from 'fumadocs-ui/components/image-zoom';

<Lightbox>
  <MDX components={getMDXComponents()} />
</Lightbox>;
```

- The image title is shown as caption, pass `caption` to `<ImageZoom />` for rich content.
- `rmiz` props don't apply inside `<Lightbox />`.
- Added translation keys of the image viewer to `@fumadocs/language`.

### Show failed searches in the search dialog

- `<SearchDialog />` accepts the `error` of search hooks, `<SearchDialogList />` shows it above the previous results.

Fix [#3698](https://github.com/fuma-nama/fumadocs/issues/3698)

## @fumadocs/language@0.2.12

### Redesigned story controls

- Props are edited in rows like the OpenAPI playground, nested objects and arrays open in a panel with breadcrumbs.
- Reset the props to the defaults of the variant.
- `fixed` values hide their controls with the Vite plugin and Turbopack loader too.
- Switching back to a variant restores its default values.
- `getDefaultValue()` leaves optional properties unset, `typeToString()` prints enums as their members.
- Updated translation keys of the controls, see `@fumadocs/language` for the new ones.

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
