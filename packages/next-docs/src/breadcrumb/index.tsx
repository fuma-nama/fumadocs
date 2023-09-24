import type { PageTree, TreeNode } from '@/server/types'
import { useMemo } from 'react'

export type BreadcrumbItem = {
  name: string
  url: string | null
}

export function useBreadcrumb(url: string, tree: PageTree): BreadcrumbItem[] {
  return useMemo(() => getBreadcrumbItems(url, tree), [tree, url])
}

export function getBreadcrumbItems(
  url: string,
  tree: PageTree
): BreadcrumbItem[] {
  const path = searchPath(tree.children, url) ?? []
  path.unshift({ name: tree.name, url: null })

  return path
}

/**
 * Search a node in the tree by a specified url
 *
 * - When an index page presents, use it as the item
 * - When the page doesn't exist, return null
 *
 * @returns The path to the target node from root
 */
function searchPath(nodes: TreeNode[], url: string): BreadcrumbItem[] | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    if (node.type === 'folder') {
      if (node.index && node.index.url === url) {
        return [
          {
            name: node.index.name,
            url: node.index.url
          }
        ]
      }

      const items = searchPath(node.children, url)

      if (items != null) {
        items.unshift({
          name: node.name,
          url: node.index?.url ?? null
        })

        return items
      }
    }

    if (node.type === 'page' && node.url === url) {
      return [
        {
          name: node.name,
          url: node.url
        }
      ]
    }
  }

  return null
}
