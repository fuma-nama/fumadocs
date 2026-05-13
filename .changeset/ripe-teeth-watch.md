---
'fumadocs-openapi': minor
---

OpenAPI: display a "Deprecated" badge for operations marked as `deprecated: true` in the spec, next to the operation heading and the method/path bar. Restores the behaviour added in #2417, which was lost during the v9→v10 move of the operation renderer from `render/operation` to `ui/operation`.
