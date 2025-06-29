import type { Code, Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import convert from 'npm-to-yarn';
import { createElement, expressionToAttribute } from './utils';
import { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

interface PackageManager {
  name: string;

  /**
   * Convert from npm to another package manager
   */
  command: (command: string) => string;
}

interface BaseOptions {
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

  packageManagers?: PackageManager[];
}

export type RemarkInstallOptions = BaseOptions &
  (
    | {
        mode?: 'legacy';
        Tabs?: string;
        Tab?: string;
      }
    | {
        mode: 'auto';
      }
  );

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
  persist = false,
  packageManagers = [
    { command: (cmd) => convert(cmd, 'npm'), name: 'npm' },
    { command: (cmd) => convert(cmd, 'pnpm'), name: 'pnpm' },
    { command: (cmd) => convert(cmd, 'yarn'), name: 'yarn' },
    { command: (cmd) => convert(cmd, 'bun'), name: 'bun' },
  ],
  ...options
}: RemarkInstallOptions = {}): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== 'package-install') return 'skip';
      const value =
        node.value.startsWith('npm') || node.value.startsWith('npx')
          ? node.value
          : `npm install ${node.value}`;
      const attributes: MdxJsxAttribute[] = [];
      if (typeof persist === 'object') {
        attributes.push(
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
        );
      }

      if (options.mode === 'auto') {
        attributes.push({
          type: 'mdxJsxAttribute',
          name: 'defaultValue',
          value: packageManagers[0].name,
        });

        const children: MdxJsxFlowElement[] = [
          {
            type: 'mdxJsxFlowElement',
            name: 'CodeBlockTabsList',
            attributes: [],
            children: packageManagers.map(
              ({ name }) =>
                ({
                  type: 'mdxJsxFlowElement',
                  attributes: [
                    { type: 'mdxJsxAttribute', name: 'value', value: name },
                  ],
                  name: 'CodeBlockTabsTrigger',
                  children: [
                    {
                      type: 'text',
                      value: name,
                    } as unknown,
                  ],
                }) as MdxJsxFlowElement,
            ),
          },
          ...packageManagers.map(
            ({ command, name }) =>
              ({
                type: 'mdxJsxFlowElement',
                name: 'CodeBlockTab',
                attributes: [
                  { type: 'mdxJsxAttribute', name: 'value', value: name },
                ],
                children: [
                  {
                    type: 'code',
                    lang: 'bash',
                    meta: node.meta,
                    value: command(value),
                  },
                ],
              }) as MdxJsxFlowElement,
          ),
        ];

        const tab: MdxJsxFlowElement = {
          type: 'mdxJsxFlowElement',
          name: 'CodeBlockTabs',
          attributes,
          children,
        };

        Object.assign(node, tab);
        return;
      }

      const { Tabs = 'Tabs', Tab = 'Tab' } = options;
      attributes.push(
        expressionToAttribute('items', {
          type: 'ArrayExpression',
          elements: packageManagers.map(({ name }) => ({
            type: 'Literal',
            value: name,
          })),
        }),
      );

      const insert = createElement(
        Tabs,
        attributes,
        packageManagers.map(({ command, name }) => ({
          type: 'mdxJsxFlowElement',
          name: Tab,
          attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: name }],
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
