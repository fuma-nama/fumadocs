---
packages:
  'fumadocs-openapi': patch
---

### Code samples

- Bodies with quotes, line breaks, NUL, BOM or bidi characters produce valid Python, Java, Go, Rust, JavaScript and C# samples that send them exactly.
- Go and Rust samples no longer indent the lines of multi-line bodies.
- `text/plain` bodies are sent as written, in samples and the playground.
- cURL samples send JSON bodies of `+json` and `; charset=` media types as JSON.
