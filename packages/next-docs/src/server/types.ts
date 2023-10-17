import type { ReactElement } from 'react'

export type PageTree = {
  name: string
  url?: string
  children: TreeNode[]
}

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
  icon?: ReactElement
  children: TreeNode[]
}

export type TOCItemType = {
  title: string
  url: string
  depth: number
}

export type TableOfContents = TOCItemType[]
