import { toRuntime, toRuntimeAsync } from "fumadocs-mdx"
import fs from "node:fs/promises"
import * as _source from "./config.ts"
import { buildConfig } from "fumadocs-mdx/config"
import { remarkInclude } from "fumadocs-mdx/runtime/mdx"
import { compileMDX } from "@fumadocs/mdx-remote"
const [err, _sourceConfig] = buildConfig(_source)
if (err) throw new Error(err)
var _temp = _sourceConfig.global?.mdxOptions ?? {}
_temp = typeof _temp === "function"? await _temp() : _temp
const _temp_remark = _temp.remarkPlugins
const _mdxOptions = { ..._temp, remarkPlugins: (v) => typeof _temp_remark === "function"? [remarkInclude, ..._temp_remark(v)] : [remarkInclude, ...v, ...(_temp_remark ?? [])] }
export const docs = [toRuntimeAsync({}, async () => {
const source = await fs.readFile("$cwd/packages/mdx/test/fixtures/index.mdx")
const collection = _sourceConfig.collections.get("docs")
const mdxOptions = collection?.mdxOptions ?? _mdxOptions

const { body, ...res } = await compileMDX({ source: source.toString(), filePath: "$cwd/packages/mdx/test/fixtures/index.mdx", mdxOptions })
return { ...res, default: body }
}, {"path":"index.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/index.mdx"}), toRuntimeAsync({}, async () => {
const source = await fs.readFile("$cwd/packages/mdx/test/fixtures/folder/test.mdx")
const collection = _sourceConfig.collections.get("docs")
const mdxOptions = collection?.mdxOptions ?? _mdxOptions

const { body, ...res } = await compileMDX({ source: source.toString(), filePath: "$cwd/packages/mdx/test/fixtures/folder/test.mdx", mdxOptions })
return { ...res, default: body }
}, {"path":"folder/test.mdx","absolutePath":"$cwd/packages/mdx/test/fixtures/folder/test.mdx"})];