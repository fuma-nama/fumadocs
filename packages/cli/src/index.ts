#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import picocolors from 'picocolors';
import { createOrLoadConfig, initConfig, type LoadedConfig } from '@/config';
import { type JsonTreeNode, treeToJavaScript, treeToMdx } from '@/commands/file-tree';
import { runTree } from '@/utils/file-tree/run-tree';
import packageJson from '../package.json';
import { customise } from '@/commands/customise';
import { add } from '@/commands/add';
import { HttpRegistryClient, LocalRegistryClient } from '@/registry/client';

const program = new Command().option('--config <string>');

program
  .name('fumadocs')
  .description('CLI to setup Fumadocs, init a config')
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
    await customise(createClientFromDir(options.dir, await createOrLoadConfig(options.config)));
  });

const dirShortcuts: Record<string, string> = {
  ':preview': 'https://preview.fumadocs.dev/registry',
  ':dev': 'http://localhost:3000/registry',
};

program
  .command('add')
  .description('add a new component to your docs')
  .argument('[components...]', 'components to download')
  .option('--dir <string>', 'the root url or directory to resolve registry')
  .action(async (input: string[], options: { config?: string; dir?: string }) => {
    const client = createClientFromDir(options.dir, await createOrLoadConfig(options.config));
    await add(input, client);
  });

program
  .command('tree')
  .argument('[json_or_args]', 'JSON output of `tree` command or arguments for the `tree` command')
  .argument('[output]', 'output path of file')
  .option('--js', 'output as JavaScript file')
  .option('--no-root', 'remove the root node')
  .option('--import-name <name>', 'where to import components (JS only)')
  .action(
    async (
      str: string | undefined,
      output: string | undefined,
      { js, root, importName }: { js: boolean; root: boolean; importName?: string },
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

function createClientFromDir(dir = 'https://fumadocs.dev/registry', config: LoadedConfig) {
  if (dir in dirShortcuts) dir = dirShortcuts[dir];

  return dir.startsWith('http://') || dir.startsWith('https://')
    ? new HttpRegistryClient(dir, config)
    : new LocalRegistryClient(dir, config);
}

program.parse();
