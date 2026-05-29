---
'fumadocs-openapi': minor
---

Add anchor links to every property in OpenAPI request bodies, response bodies, and parameters.

Each property rendered inline gets a stable `id` and a hover-revealed copy-link button (matches the existing fumadocs heading anchor pattern). Clicking the button copies the full URL to the clipboard so writers can deep-link to a specific property from guides and instructions.

IDs use `-` between the operation-level prefix and `.` between schema-internal path segments:

- Request body: `#body.<prop>` (e.g. `#body.user`)
- Response per status: `#response-<status>.<prop>` (e.g. `#response-200.data`)
- Parameters: `#parameters-<location>-<name>` (e.g. `#parameters-query-limit`)

Deeper paths work too: `#body.user.address.street`. When the hash lives below a top-level property, the schema-popover auto-opens with its breadcrumb already navigated, the array `Show array` collapsible auto-expands, and `oneOf` / `anyOf` tabs switch to the variant containing the targeted field. Once consumed, subsequent clicks on the same trigger open the base view — a different deep hash re-arms the auto-open.

The new `idPrefix` option on `SchemaUI` opts arbitrary `Schema` renderings into the same behavior.
