import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import convert from 'npm-to-yarn';
import {
  type CodeBlockTabsOptions,
  generateCodeBlockTabs,
} from '@/mdx-plugins/codeblock-utils';

interface PackageManager {
  name: string;

  /**
   * Default to `name`
   */
  value?: string;

  /**
   * Convert from npm to another package manager
   */
  command: (command: string) => string | undefined;
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
  packageManagers = [
    { command: (cmd) => convert(cmd, 'npm'), name: 'npm' },
    { command: (cmd) => convert(cmd, 'pnpm'), name: 'pnpm' },
    { command: (cmd) => convert(cmd, 'yarn'), name: 'yarn' },
    { command: (cmd) => convert(cmd, 'bun'), name: 'bun' },
  ],
}: RemarkNpmOptions = {}): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (!node.lang || !aliases.includes(node.lang)) return;
      let code = node.value;

      if (
        node.lang === 'package-install' &&
        !code.startsWith('npm') &&
        !code.startsWith('npx')
      ) {
        code = `npm install ${code}`;
      }
      const options: CodeBlockTabsOptions = {
        persist,
        tabs: [],
        triggers: [],
      };

      for (const manager of packageManagers) {
        const value = manager.value ?? manager.name;
        const command = manager.command(code);
        if (!command || command.length === 0) continue;

        options.defaultValue ??= value;
        options.triggers.push({
          value,
          children: [{ type: 'text', value: manager.name }],
        });
        options.tabs.push({
          value,
          children: [
            {
              type: 'code',
              lang: 'bash',
              meta: node.meta,
              value: command,
            },
          ],
        });
      }

      Object.assign(node, generateCodeBlockTabs(options));
      return 'skip';
    });
  };
}
