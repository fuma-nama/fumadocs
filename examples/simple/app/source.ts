import { allDocs, allMeta } from 'contentlayer/generated'
import { createContentlayer } from 'next-docs-zeta/contentlayer'

export const { getPage, tree } = createContentlayer(allMeta, allDocs)
