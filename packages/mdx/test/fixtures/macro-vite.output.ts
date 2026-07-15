import * as __fdm from "fumadocs-mdx/runtime/macro";

import { z } from 'zod';

export const docs = await __fdm.docs({ base: "test/fixtures/generate-index-docs", entries: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index-docs",
  "eager": true,
  "query": {
    "macro_id": "test/fixtures/macro/source.ts#docs"
  }
}), meta: import.meta.glob(["./**/*.{json,yaml}"], {
  "base": "./../generate-index-docs",
  "eager": true,
  "import": "default",
  "query": {
    "macro_id": "test/fixtures/macro/source.ts#docs"
  }
}) });

export const blog = await __fdm.docAsync({ base: "test/fixtures/generate-index", passthroughs: ["extractedReferences"], head: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index",
  "eager": true,
  "import": "frontmatter",
  "query": {
    "macro_id": "test/fixtures/macro/source.ts#blog",
    "only": "frontmatter"
  }
}), body: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index",
  "query": {
    "macro_id": "test/fixtures/macro/source.ts#blog"
  }
}) });

export const metaOnly = await __fdm.meta({ base: "test/fixtures/generate-index", meta: import.meta.glob(["./**/*.{json,yaml}"], {
  "base": "./../generate-index",
  "eager": true,
  "import": "default",
  "query": {
    "macro_id": "test/fixtures/macro/source.ts#metaOnly"
  }
}) });
