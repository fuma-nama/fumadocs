---
packages:
  '@fumadocs/asyncapi': minor
  '@fumadocs/language': patch
---

### Redesigned AsyncAPI pages

- Messages are labelled **Receive** and **Send** for readers, instead of the `send` and `receive` of the documented application, the sidebar shows them as icons.
- A connection bar shows the channel address with the server below it, brokers label the address as a topic, queue or subject.
- Messages are listed in an accordion, their examples beside the payload and headers on wide pages.
- Example cards are titled with the name and summary of examples, selects switch to other examples and to their headers.
- Protocol details only show the bindings of the selected server, `x-*` bindings are hidden.
- A WebSocket playground connects to channels, sends messages from their examples and identifies the received ones.
- The playground edits address parameters in its URL and previews the URL to connect.
- Code samples in JavaScript and Python for WebSocket, MQTT, Kafka, AMQP and NATS servers, and from `x-codeSamples` of operations.
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

- Added the `playground` option of `createAsyncAPIPage()`, and `usePlayground()` from `@fumadocs/asyncapi/playground`.
- Added the `generateTypeScriptDefinitions` option, payloads and headers can be copied as TypeScript types.
- Added the `codeUsages` option and `slots.usage` of `renderOperationLayout`, with `createCodeUsageGeneratorRegistry()` and `registerDefaultCodeUsages()` from `@fumadocs/asyncapi/ui`.
- Added `getText()` to the data of AsyncAPI pages, their operations in Markdown for LLMs.
- Added `received` to `OperationMessage`, whether readers receive the message.
