---
packages:
  'fumadocs-openapi': patch
---

### Cookie parameters

- Exploded `form` cookies are sent as `color=blue&color=black` and `R=100&G=200`, instead of repeating the name as `color=color=blue&color=black` or splitting an object into separate cookies.
- `style: cookie` is supported: values are sent as given and joined by `; `.
- Code usages percent-encode `form` cookie values like the playground.
