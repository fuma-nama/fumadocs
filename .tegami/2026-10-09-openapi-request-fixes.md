---
packages:
  'fumadocs-openapi': patch
---

### Fix code samples and matrix parameters

- Render absolute server URLs on the server instead of `https://example.com`.
- Escape values correctly in every language, and send `multipart/form-data` fields.
- Go, Java, C# and Rust samples compile for every HTTP method.
- Serialize `style: matrix` arrays according to `explode`.

Fix [#3673](https://github.com/fuma-nama/fumadocs/issues/3673)
