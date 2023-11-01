import { map } from '@/_map'
import { fromMap } from 'next-docs-mdx/map'

export const { getPage, getPageUrl, pages, tree } = fromMap(map)
