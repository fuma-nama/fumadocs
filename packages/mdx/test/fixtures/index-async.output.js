// @ts-nocheck -- skip type checking
import { _runtimeAsync, buildConfig } from "fumadocs-mdx/runtime/async"
const [err, _sourceConfig] = buildConfig(_source)
if (!_sourceConfig) throw new Error(err)
import { _runtime } from "fumadocs-mdx"
import * as _source from "./config"
export const docs = _runtimeAsync.doc<typeof _source.docs>([{"info":{"path":"index.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/index.mdx"},"data":{}}, {"info":{"path":"folder/test.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/folder/test.mdx"},"data":{}}], "docs", _sourceConfig)