---
packages:
  '@fumadocs/notion': patch
---

### Safer file proxy and links

- `createNotionFileHandler()` caches each file once for all forms of its IDs (case, dashes).
- `//host` and `/\host` links and embeds are treated as other hosts, not paths of the site.
