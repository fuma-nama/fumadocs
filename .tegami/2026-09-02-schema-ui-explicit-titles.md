---
packages:
  npm:@fumadocs/api-docs: patch
---

## Use the explicit title of composed schemas in Schema UI

`mergeAllOf` now keeps an explicit title as the display alias of the composed schema (`ChildA | ChildB`), skips titles already covered by the other side of an intersection (`DerivedConfig`, `array<NamedItem>`), and still combines the titles of untitled intersections (`Readable & Writable`).
