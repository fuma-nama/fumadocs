---
'fumadocs-core': major
---

*Migrate to New Orama Cloud*

`@orama/core` is the new version of Orama Cloud client. See [their docs](https://docs.orama.com/docs/cloud/data-sources/rest-APIs/official-SDK/introduction) for details.

When using Fumadocs' Orama Cloud integration, you need to use the new client instead:


```ts
import { sync } from 'fumadocs-core/search/orama-cloud';
import { OramaCloud } from '@orama/core';

// update this
const orama = new OramaCloud({
  projectId: '<project id>',
  apiKey: '<private api key>',
});

await sync(orama, {
  index: '<data source id>',
  documents: records,
});
```