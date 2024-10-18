import fs from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import picocolors from 'picocolors';
import {
  isCancel,
  log,
  multiselect,
  outro,
  select,
  spinner,
} from '@clack/prompts';
import { init } from '@/commands/init';
import { add, localResolver, remoteResolver } from '@/commands/add';
import { initConfig, loadConfig } from '@/config';
import { plugins } from '@/plugins';
import {
  type JsonTreeNode,
  treeToJavaScript,
  treeToMdx,
} from '@/commands/file-tree';
import { runTree } from '@/utils/file-tree/run-tree';
import { type OutputIndex } from '@/build';
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

const dirShortcuts: Record<string, string> = {
  ':dev': 'https://fumadocs-dev.vercel.app/registry',
};

program
  .command('add')
  .description('add a new component to your docs')
  .argument('[components...]', 'components to download')
  .option('--dir <string>', 'the root url or directory to resolve registry')
  .option('--config <string>')
  .action(
    async (input: string[], options: { config?: string; dir?: string }) => {
      let dir = options.dir ?? 'https://fumadocs.vercel.app/registry';
      if (dir in dirShortcuts) dir = dirShortcuts[dir];

      const resolver =
        dir.startsWith('http://') || dir.startsWith('https://')
          ? remoteResolver(dir)
          : localResolver(dir);
      let target = input;

      if (input.length === 0) {
        const spin = spinner();
        spin.start('fetching registry');
        const registry = (await resolver('_registry.json')) as
          | OutputIndex[]
          | undefined;
        spin.stop(picocolors.bold(picocolors.greenBright('registry fetched')));

        if (!registry) {
          log.error(`Failed to fetch '_registry.json' file from ${dir}`);
          throw new Error(`Failed to fetch registry`);
        }

        const value = await multiselect({
          message: 'Select components to install',
          options: registry.map((item) => ({
            label: item.name,
            value: item.name,
            hint: item.description,
          })),
        });

        if (isCancel(value)) {
          outro('Ended');
          return;
        }

        target = value as string[];
      }

      const loadedConfig = await loadConfig(options.config);
      for (const name of target) {
        await add(name, resolver, loadedConfig);
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

program.parse();
