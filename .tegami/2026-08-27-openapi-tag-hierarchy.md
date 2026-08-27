---
packages:
  npm:fumadocs-openapi: patch
---

## Support OpenAPI 3.2 tag hierarchy in `groupBy: 'tag'`

`generateFiles` now follows the tag hierarchy introduced in OpenAPI 3.2: a tag with a `parent` becomes a folder nested inside its parent tag's folder (including the generated `meta.json`), and tags with a `kind` other than `nav` no longer form groups, matching their intent (e.g. `badge`).

Operations referencing undeclared tags or having no tags are no longer dropped silently, which previously could produce an empty output directory. Undeclared tags now form their own group, and untagged operations are grouped under an `unknown` folder with a warning.
