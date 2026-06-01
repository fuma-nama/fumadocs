---
'fumadocs-openapi': minor
---

Add anchor links to every property in OpenAPI request bodies, response bodies, and parameters.

Each property rendered inline gets a stable `id` and a hover-revealed copy-link button (matches the existing fumadocs heading anchor pattern). Clicking the button copies the full URL to the clipboard so writers can deep-link to a specific property from guides and instructions.

Two ID styles depending on context:

- **Request/response property paths** — `-` separates operation-level segments, `.` separates schema-internal path segments:
  - Request body: `#body.<prop>` (e.g. `#body.user`)
  - Response per status: `#response-<status>.<prop>` (e.g. `#response-200.data`)
  - Deeper paths: `#body.user.address.street`
- **Parameter anchors** — a flat, hyphen-separated id with no schema-internal path:
  - `#parameters-<location>-<name>` (e.g. `#parameters-query-limit`)
  - If a parameter is itself an object, its sub-properties still join with `.` — e.g. `#parameters-query-filter.foo`.

When an operation has multiple body or response content types, the media type is folded into the prefix so anchors stay unique (e.g. `#application-json-body.user` vs `#application-xml-body.user`, `#response-200-application-json.data`). The content-type selector auto-switches to the targeted tab when a deep link arrives. Single-content-type operations keep the simple `body` / `response-<status>` form.

Property names are encoded into anchor segments via `encodeURIComponent` (with `.` additionally percent-encoded) so distinct names like `ETag` vs `etag`, `foo bar` vs `foo-bar`, or non-ASCII keys don't collapse to the same anchor. When the hash lives below a top-level property, the schema-popover auto-opens with its breadcrumb already navigated, the array `Show array` collapsible auto-expands, and `oneOf` / `anyOf` tabs switch to the variant containing the targeted field. Once consumed, subsequent clicks on the same trigger open the base view — a different deep hash re-arms the auto-open.

The new `idPrefix` option on `SchemaUI` opts arbitrary `Schema` renderings into the same behavior.
