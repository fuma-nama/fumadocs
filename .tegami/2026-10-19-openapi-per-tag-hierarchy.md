---
packages:
  'fumadocs-openapi': patch
---

### Tag hierarchy in `per: 'tag'`

- Pages follow the OpenAPI 3.2 tag hierarchy, in the folder of their `parent` tag.
- Tags without operations or with a `kind` other than `nav` get no page.
- Undeclared tags get pages too, untagged operations are listed in `unknown`.
- Index cards of `generateFiles()` include pages in folders.

Fix [#3719](https://github.com/fuma-nama/fumadocs/issues/3719)
