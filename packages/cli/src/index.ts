import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import picocolors from 'picocolors';
import { isCancel, multiselect, outro, select } from '@clack/prompts';
import { init } from '@/commands/init';
import { add } from '@/commands/add';
import { initConfig, loadConfig } from '@/config';
import { plugins } from '@/plugins';
import { components } from '@/generated';
import {
  type JsonTreeNode,
  treeToJavaScript,
  treeToMdx,
} from '@/commands/file-tree';
import { runTree } from '@/utils/file-tree/run-tree';
import packageJson from '../package.json';

const program = new Command();

program
  .name('fumadocs')
  .description('CLI to setup Fumadocs')
  .version(packageJson.version);

program
  .command('config')
  .description('init a config for Fumadocs CLI')
  .action(async () => {
    await initConfig();
    console.log(picocolors.green('Successful: ./cli.json'));
  });

program
  .command('init')
  .description('init a new plugin to your docs')
  .argument('[string]', 'plugin name')
  .option('--config <string>')
  .action(async (str: string | undefined, { config }) => {
    const loadedConfig = await loadConfig(config as string | undefined);

    if (str) {
      const plugin = str in plugins ? plugins[str] : undefined;
      if (!plugin) throw new Error(`Plugin not found: ${str}`);

      await init(plugin, loadedConfig);
      return;
    }

    const value = await select({
      message: 'Select components to install',
      options: Object.keys(plugins).map((c) => ({
        label: c,
        value: c,
      })),
    });

    if (isCancel(value)) {
      outro('Ended');
      return;
    }

    await init(plugins[value as keyof typeof plugins], loadedConfig);
  });

program
  .command('add')
  .description('add a new component to your docs')
  .argument('[components...]', 'components to download')
  .option(
    '--branch <string>',
    'the Git branch name of Fumadocs repo to download from (e.g. main)',
  )
  .option('--config <string>')
  .action(
    async (
      str: string[],
      { config, branch }: { config?: string; branch?: string },
    ) => {
      let target = str;

      if (str.length === 0) {
        const value = await multiselect({
          message: 'Select components to install',
          options: components.map((c) => ({
            label: c,
            value: c,
          })),
        });

        if (isCancel(value)) {
          outro('Ended');
          return;
        }

        target = value as string[];
      }

      const loadedConfig = await loadConfig(config);
      for (const name of target) {
        await add(name, branch ?? 'main', loadedConfig);
      }
    },
  );

program
  .command('tree')
  .argument(
    '[json_or_args]',
    'JSON output of `tree` command or arguments for the `tree` command',
  )
  .argument('[output]', 'output path of file')
  .option('--js', 'output as JavaScript file')
  .option('--no-root', 'remove the root node')
  .option('--import-name <name>', 'where to import components (JS only)')
  .action(
    async (
      str: string | undefined,
      output: string | undefined,
      {
        js,
        root,
        importName,
      }: { js: boolean; root: boolean; importName?: string },
    ) => {
      const jsExtensions = ['.js', '.tsx', '.jsx'];
      const noRoot = !root;
      let nodes: JsonTreeNode[];

      try {
        nodes = JSON.parse(str ?? '') as JsonTreeNode[];
      } catch (e) {
        nodes = await runTree(str ?? './');
      }

      const out =
        js || (output && jsExtensions.includes(path.extname(output)))
          ? treeToJavaScript(nodes, noRoot, importName)
          : treeToMdx(nodes, noRoot);

      if (output) {
        await fs.mkdir(path.dirname(output), { recursive: true });
        await fs.writeFile(output, out);
      } else {
        console.log(out);
      }
    },
  );

program.parse();
