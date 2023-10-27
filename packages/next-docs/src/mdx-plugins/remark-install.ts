import type { Code, Root } from 'mdast'
import type { Transformer } from 'unified'
import { visit } from './unist-visit'

type PackageManager = (name: string) => {
  packageManager: string
  command: string
}

export type RemarkInstallOptions = Partial<{
  Tabs: string
  Tab: string
  packageManagers: PackageManager[]
}>

/**
 * It generates the following structure from a code block with `package-install` as language
 *
 * ```tsx
 * <Tabs items={["pnpm", "npm", "yarn"]}>
 *  <Tab value="pnpm">...</Tab>
 *  ...
 * </Tabs>
 * ```
 */
export function remarkInstall({
  Tab = 'Tab',
  Tabs = 'Tabs',
  packageManagers = [
    name => ({ command: `npm install ${name}`, packageManager: 'npm' }),
    name => ({ command: `pnpm add ${name}`, packageManager: 'pnpm' }),
    name => ({ command: `yarn add ${name}`, packageManager: 'yarn' })
  ]
}: RemarkInstallOptions = {}): Transformer<Root, Root> {
  return tree => {
    visit(tree, ['code'], (node: Code) => {
      if (node.lang !== 'package-install') return 'skip'

      const managers = packageManagers.map(manager => manager(node.value))

      const insert = {
        type: 'mdxJsxFlowElement',
        name: Tabs,
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'items',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              data: {
                estree: {
                  body: [
                    {
                      type: 'ExpressionStatement',
                      expression: {
                        type: 'ArrayExpression',
                        elements: managers.map(({ packageManager }) => ({
                          type: 'Literal',
                          value: packageManager
                        }))
                      }
                    }
                  ]
                }
              }
            }
          }
        ],
        children: managers.map(({ command, packageManager }) => ({
          type: 'mdxJsxFlowElement',
          name: Tab,
          attributes: [
            { type: 'mdxJsxAttribute', name: 'value', value: packageManager }
          ],
          children: [
            {
              type: 'code',
              lang: 'bash',
              value: command
            } satisfies Code
          ]
        }))
      }

      Object.assign(node, insert)
    })
  }
}
