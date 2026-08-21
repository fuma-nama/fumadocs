---
packages:
  npm:fumadocs-core:
    type: patch
---

## Fix locale-only pages leaking into other locales

i18n storages no longer share folder arrays with the fallback locale. Locale-only pages previously appeared in every locale's page tree as duplicate nodes.
