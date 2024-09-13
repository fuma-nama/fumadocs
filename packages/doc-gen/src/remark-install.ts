import type { Code, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import convert from 'npm-to-yarn';
import { createElement, expressionToAttribute } from './utils';

interface PackageManager {
  name: string;

  /**
   * Convert from npm to another package manager
   */
  command: (command: string) => string;
}

export type RemarkInstallOptions = Partial<{
  Tabs: string;
  Tab: string;

  /**
   * Persist Tab value (Fumadocs UI only)
   *
   * @defaultValue false
   */
  persist?:
    | {
        id: string;
      }
    | false;

  packageManagers: PackageManager[];
}>;

/**
 * It generates the following structure from a code block with `package-install` as language
 *
 * @example
 * ```tsx
 * <Tabs items={["npm", "pnpm", "yarn", "bun"]}>
 *  <Tab value="pnpm">...</Tab>
 *  ...
 * </Tabs>
 * ```
 */
export function remarkInstall({
  Tab = 'Tab',
  Tabs = 'Tabs',
  persist = false,
  packageManagers = [
    { command: (cmd) => convert(cmd, 'npm'), name: 'npm' },
    { command: (cmd) => convert(cmd, 'pnpm'), name: 'pnpm' },
    { command: (cmd) => convert(cmd, 'yarn'), name: 'yarn' },
    { command: (cmd) => convert(cmd, 'bun'), name: 'bun' },
  ],
}: RemarkInstallOptions = {}): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== 'package-install') return 'skip';

      const value =
        node.value.startsWith('npm') || node.value.startsWith('npx')
          ? node.value
          : `npm install ${node.value}`;

      const insert = createElement(
        Tabs,
        [
          ...(typeof persist === 'object'
            ? [
                {
                  type: 'mdxJsxAttribute',
                  name: 'groupId',
                  value: persist.id,
                },
                {
                  type: 'mdxJsxAttribute',
                  name: 'persist',
                  value: null,
                },
              ]
            : []),
          expressionToAttribute('items', {
            type: 'ArrayExpression',
            elements: packageManagers.map(({ name }) => ({
              type: 'Literal',
              value: name,
            })),
          }),
        ],
        packageManagers.map(({ command, name }) => ({
          type: 'mdxJsxFlowElement',
          name: Tab,
          attributes: [
            { type: 'mdxJsxAttribute', name: 'value', value: name },
          ].filter(Boolean),
          children: [
            {
              type: 'code',
              lang: 'bash',
              meta: node.meta,
              value: command(value),
            } satisfies Code,
          ],
        })),
      );

      Object.assign(node, insert);
    });
  };
}
