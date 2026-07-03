import { defineMdastPlugin } from 'satteri';
import convert from 'npm-to-yarn';
import { generateCodeBlockTabs } from 'fumadocs-core/mdx-plugins/codeblock-utils';
import type { CodeBlockTabsOptions } from 'fumadocs-core/mdx-plugins/codeblock-utils';

interface PackageManager {
  name: string;
  value?: string;
  command: (command: string) => string | undefined;
}

export interface RemarkNpmOptions {
  persist?: { id: string } | false;
  packageManagers?: PackageManager[];
}

function convertLines(cmd: string, to: 'yarn' | 'pnpm' | 'bun') {
  return cmd
    .split('\n')
    .map((l) => convert(l, to))
    .join('\n');
}

export function remarkNpm({
  persist = false,
  packageManagers = [
    { command: (cmd) => cmd, name: 'npm' },
    { command: (cmd) => convertLines(cmd, 'pnpm'), name: 'pnpm' },
    { command: (cmd) => convertLines(cmd, 'yarn'), name: 'yarn' },
    { command: (cmd) => convertLines(cmd, 'bun'), name: 'bun' },
  ],
}: RemarkNpmOptions = {}) {
  return defineMdastPlugin({
    name: 'remark-npm',
    code(node, ctx) {
      let code: string;
      switch (node.lang) {
        case 'package-install':
          code = node.value;
          if (!code.startsWith('npm') && !code.startsWith('npx')) {
            code = `npm install ${code}`;
          }
          break;
        case 'npm':
          code = node.value;
          break;
        default:
          return;
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

      ctx.replaceNode(node, generateCodeBlockTabs(options));
    },
  });
}
