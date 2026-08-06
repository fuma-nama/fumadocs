---
packages:
  npm:fumadocs-core: patch
---

## Fix unusable `tokenizer` search option

The search engine rejects a `language` alongside a custom `tokenizer`, since the tokenizer carries its own. Both search entry points supplied one unconditionally — `createDB`/`createDBSimple` through a destructuring default that `language: undefined` could not suppress, and `createI18nSearchAPI` by hardcoding `multilingual` after the spread — so passing `tokenizer` always threw `NO_LANGUAGE_WITH_CUSTOM_TOKENIZER` at index-build time. On i18n sources there was no call that worked at all.

`language` is now omitted when a tokenizer is present (from either `tokenizer` or `components.tokenizer`), and i18n servers no longer overwrite a caller-supplied `language`. Attaching a stemmer to the default multilingual segmentation works as documented:

```ts
import { stemmer } from '@zbsearch/stemmers/english';

createFromSource(source, {
  tokenizer: { language: 'multilingual', stemming: true, stemmer },
});
```
