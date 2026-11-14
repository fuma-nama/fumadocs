---
packages:
  'fumadocs-openapi': patch
---

### Form bodies keep their fields

- `application/x-www-form-urlencoded` bodies keep `0`, `false` and empty fields in code usages, leave out unset fields instead of sending `"null"`, repeat the key for each array item and send objects as JSON, like `multipart/form-data`.
- The playground and the code usages of every language send the same form body.
