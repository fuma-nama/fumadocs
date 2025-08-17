import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import {
  installDependenciesCommand,
  PackageManagerName,
  packageManagers as packageManagersMap,
} from 'nypm';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

interface PackageManager {
  name: PackageManagerName;

  /**
   * Convert from npm to another package manager
   */
  command: (command: string) => string;
}

export interface RemarkNpmOptions {
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

const aliases = ['npm', 'package-install'];

/**
 * It generates multiple tabs of codeblocks for different package managers from a npm command codeblock.
 */
export function remarkNpm({
  persist = false,
  packageManagers = packageManagersMap.map(({ name }) => ({
    name,
    command: (cmd) => `${installDependenciesCommand(name)} ${cmd}`,
  })),
}: RemarkNpmOptions = {}): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (!node.lang || !aliases.includes(node.lang)) return 'skip';

      const value =
        node.value.startsWith('npm') || node.value.startsWith('npx')
          ? node.value
          : `npm install ${node.value}`;
      const attributes: MdxJsxAttribute[] = [
        {
          type: 'mdxJsxAttribute',
          name: 'defaultValue',
          value: packageManagers[0].name,
        },
      ];

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
      ];

      for (const { name, command } of packageManagers) {
        children.push({
          type: 'mdxJsxFlowElement',
          name: 'CodeBlockTab',
          attributes: [{ type: 'mdxJsxAttribute', name: 'value', value: name }],
          children: [
            {
              type: 'code',
              lang: 'bash',
              meta: node.meta,
              value: command(value),
            },
          ],
        });
      }

      const tab: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'CodeBlockTabs',
        attributes,
        children,
      };

      Object.assign(node, tab);
      return;
    });
  };
}
