import { toRuntime } from "fumadocs-mdx"
import * as _source from "./config.ts"
import { asyncFiles, buildConfig } from "fumadocs-mdx/runtime/async"
const [err, _sourceConfig] = buildConfig(_source)
if (err) throw new Error(err)
export const docs = asyncFiles([{"frontmatter":{},"file":{"path":"index.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/index.mdx"}}, {"frontmatter":{},"file":{"path":"folder/test.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/folder/test.mdx"}}], "docs", _sourceConfig)