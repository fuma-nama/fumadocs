---
packages:
  npm:fumadocs-openapi: patch
  npm:@fumadocs/api-docs: patch
---

## Fix OpenAPI 3.0 `example` in external files crashing `OpenAPIPage`

The version upgrader ran after external documents were embedded under `x-ext`, where it can no longer classify schemas by their JSON path: a schema-level `example` from an external 3.0 file became an Example Object map instead of the JSON Schema `examples` array, crashing the schema UI with `schema.examples is not iterable`.

Each document is now upgraded before bundling embeds it. This also honors the external file's own declared OpenAPI version, so a 3.0 file referenced from a 3.1 document is upgraded too (previously it was skipped entirely).
