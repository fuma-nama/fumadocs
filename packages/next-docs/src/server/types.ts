import type FlexSearch from 'flexsearch'
import type { ReactElement } from 'react'

export type TreeNode = FileNode | Separator | FolderNode

export type FileNode = {
  type: 'page'
  name: string
  url: string
  icon?: ReactElement
}

export type Separator = {
  type: 'separator'
  name: string
}

export type FolderNode = {
  type: 'folder'
  name: string
  index?: FileNode
  children: TreeNode[]
}

export type IndexPage = {
  title: string
  content: string
  url: string
  keywords?: string
}

export type SearchDocsResult =
  FlexSearch.EnrichedDocumentSearchResultSetUnitResultUnit<IndexPage>[]

export type TOCItemType = {
  title: string
  url: string
  depth: number
}

export type TableOfContents = TOCItemType[]
