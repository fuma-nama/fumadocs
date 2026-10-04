---
packages:
  '@fumadocs/json-schema': minor
---

### Headless Schema UI

`<SchemaUIProvider />` from `@fumadocs/json-schema/react/client` holds the state of a Schema UI: the schemas opened from properties, the selected members of unions, and links to a property. `useSchemaUI()` reads and navigates it.

The Schema UI installed with Fumadocs CLI (`api-docs/schema`) is built on it, so the installed code is only UI.
