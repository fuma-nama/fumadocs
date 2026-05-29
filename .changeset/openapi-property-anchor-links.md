---
'fumadocs-openapi': minor
---

Add anchor links to every property in OpenAPI request bodies, response bodies, and parameters.

Each property rendered inline now gets a stable `id` and a hover-revealed link icon, so writers can deep-link directly to a specific property from guides and instructions. IDs follow a predictable scheme:

- Request body properties: `#body-<prop>` (e.g. `#body-user-email`)
- Response body properties: `#response-<status>-<prop>` (e.g. `#response-200-data-id`)
- Parameters: `#parameters-<location>-<name>` (e.g. `#parameters-query-limit`)

The new `idPrefix` option on `SchemaUI` opts arbitrary `Schema` renderings into the same behavior.
