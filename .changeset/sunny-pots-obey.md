---
"fumadocs-openapi": minor
---

Fixed a performance issue where getSchema() would bypass the internal cache and re-parse the OpenAPI spec on every call. This was caused by calling the internal getSchemas() function instead of the cached method.
