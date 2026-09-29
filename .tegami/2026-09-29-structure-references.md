---
packages:
  'fumadocs-core': patch
---

### Skip reference images in structured data

`structure()` and `remarkStructure` indexed reference-style images and links as raw Markdown, such as the `![][image1]` that Google Docs exports for every image. Reference images are now skipped and reference links keep only their text, like inline ones.
