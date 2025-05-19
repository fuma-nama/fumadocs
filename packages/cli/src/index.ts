#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import picocolors from 'picocolors';
import { isCancel, outro, select } from '@clack/prompts';
import { init } from '@/commands/init';
import {
  localResolver,
  remoteResolver,
  type Resolver,
} from '@/utils/add/install-component';
import { initConfig, loadConfig } from '@/config';
import { plugins } from '@/plugins';
import {
  type JsonTreeNode,
  treeToJavaScript,
  treeToMdx,
} from '@/commands/file-tree';
import { runTree } from '@/utils/file-tree/run-tree';
import packageJson from '../package.json';
import { customise } from '@/commands/customise';
import { add } from '@/commands/add';

const program = new Command().option('--config <string>');

program
  .name('fumadocs')
  .description('CLI to setup Fumadocs, init a config ')
  .version(packageJson.version)
  .action(async () => {
    if (await initConfig()) {
      console.log(picocolors.green('Initialized a `./cli.json` config file.'));
    } else {
      console.log(picocolors.redBright('A config file already exists.'));
    }
  });

program
  .command('customise')
  .alias('customize')
  .description('simple way to customise layouts with Fumadocs UI')
  .option('--dir <string>', 'the root url or directory to resolve registry')
  .action(async (options: { config?: string; dir?: string }) => {
    const resolver = getResolverFromDir(options.dir);
    await customise(resolver, await loadConfig(options.config));
  });

program
  .command('init')
  .description('init a new plugin to your docs')
  .argument('[string]', 'plugin name')
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

const dirShortcuts: Record<string, string> = {
  ':dev': 'https://preview.fumadocs.dev/registry',
  ':localhost': 'http://localhost:3000/registry',
};

program
  .command('add')
  .description('add a new component to your docs')
  .argument('[components...]', 'components to download')
  .option('--dir <string>', 'the root url or directory to resolve registry')
  .action(
    async (input: string[], options: { config?: string; dir?: string }) => {
      const resolver = getResolverFromDir(options.dir);
      await add(input, resolver, await loadConfig(options.config));
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
      } catch {
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

function getResolverFromDir(
  dir: string = 'https://fumadocs.dev/registry',
): Resolver {
  if (dir in dirShortcuts) dir = dirShortcuts[dir];

  return dir.startsWith('http://') || dir.startsWith('https://')
    ? remoteResolver(dir)
    : localResolver(dir);
}

program.parse();
