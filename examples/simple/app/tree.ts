import { allDocs, allMeta } from 'contentlayer/generated'
import { buildPageTree, loadContext } from 'next-docs-zeta/contentlayer'

const ctx = loadContext(allMeta, allDocs)

export const tree = buildPageTree(ctx)
