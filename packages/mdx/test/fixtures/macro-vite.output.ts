import * as __fdm from "fumadocs-mdx/runtime/macro";

import { z } from 'zod';

export const docs = await __fdm.docs({ base: "test/fixtures/generate-index-docs", entries: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index-docs",
  "eager": true,
  "query": {
    "collection": "test_fixtures_macro_source_ts_0",
    "cfg": "test/fixtures/macro/source.ts",
    "id": "0"
  }
}), meta: import.meta.glob(["./**/*.{json,yaml}"], {
  "base": "./../generate-index-docs",
  "eager": true,
  "import": "default",
  "query": {
    "collection": "test_fixtures_macro_source_ts_0",
    "cfg": "test/fixtures/macro/source.ts",
    "id": "0"
  }
}) });

export const blog = await __fdm.docAsync({ base: "test/fixtures/generate-index", passthroughs: ["extractedReferences"], head: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index",
  "eager": true,
  "import": "frontmatter",
  "query": {
    "collection": "test_fixtures_macro_source_ts_1",
    "cfg": "test/fixtures/macro/source.ts",
    "id": "1",
    "only": "frontmatter"
  }
}), body: import.meta.glob(["./**/*.{mdx,md}"], {
  "base": "./../generate-index",
  "query": {
    "collection": "test_fixtures_macro_source_ts_1",
    "cfg": "test/fixtures/macro/source.ts",
    "id": "1"
  }
}) });

export const metaOnly = await __fdm.meta({ base: "test/fixtures/generate-index", meta: import.meta.glob(["./**/*.{json,yaml}"], {
  "base": "./../generate-index",
  "eager": true,
  "import": "default",
  "query": {
    "collection": "test_fixtures_macro_source_ts_2",
    "cfg": "test/fixtures/macro/source.ts",
    "id": "2"
  }
}) });
