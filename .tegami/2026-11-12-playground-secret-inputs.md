---
packages:
  'fumadocs-openapi': patch
  '@fumadocs/asyncapi': patch
  '@fumadocs/graphql': patch
---

### Credentials in the playground

- API keys and tokens use password inputs, like passwords already do, so session replay tools don't record them as typed.
- Code usages and the connection URL show credentials as `********`.
- Tokens are entered after their scheme, which `Value` rows of auth providers show with `start`. Values with a scheme still work.
- Optional fields out of the request show as muted rows with their default or example, clicking one adds it in place.
- `null` is chosen from the type of nullable fields, and an added text field left empty sends `""`.
- The type of a field and its actions (choose a type, add, unset, remove) share one pill in their own column. Selects and objects show their value with its arrow.
- Field names open their description and constraints on hover.
- Boolean fields use a select, like enums.
- The connection URL is one line as tall as a field row, and the message composer shows only while connected.
