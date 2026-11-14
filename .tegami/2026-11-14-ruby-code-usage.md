---
packages:
  'fumadocs-openapi': patch
---

### Ruby code usages

- Operation pages and the playground show a Ruby code usage, with `Net::HTTP` from the standard library. Every body media type is supported, multipart bodies are sent with `set_form`.
- `fumadocs-openapi/requests/generators/ruby` exports the generator.
