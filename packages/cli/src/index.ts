#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { cac } from 'cac';
import picocolors from 'picocolors';
import { createOrLoadConfig, initConfig } from '@/config';
import { type JsonTreeNode, treeToJavaScript, treeToMdx } from '@/commands/file-tree';
import { runTree } from '@/utils/file-tree/run-tree';
import packageJson from '../package.json';
import { customise } from '@/commands/customise';
import { add } from '@/commands/add';
import { exportEpub } from '@/commands/export-epub';
import { registerFeatureCommands } from '@/commands/feature';
import { HttpRegistryConnector, LocalRegistryConnector } from 'fuma-cli/registry/connector';

const cli = cac('fumadocs');
cli.option('--config <string>', 'path to the config file');

cli.command('', 'init a `cli.json` config file').action(async () => {
  if (await initConfig()) {
    console.log(picocolors.green('Initialized a `./cli.json` config file.'));
  } else {
    console.log(picocolors.redBright('A config file already exists.'));
  }
});

cli
  .command('customise', 'simple way to customize layouts with Fumadocs UI')
  .alias('customize')
  .option('--dir <string>', 'the root url or directory to resolve registry')
  .action(async (options: { config?: string; dir?: string }) => {
    const config = await createOrLoadConfig(options.config);
    await customise(config, createClientFromDir(options.dir));
  });

const dirShortcuts: Record<string, string> = {
  ':preview': 'https://preview.fumadocs.dev/registry',
  ':dev': 'http://localhost:3000/registry',
};

cli
  .command('add [...components]', 'add a new component to your docs')
  .option('--dir <string>', 'the root url or directory to resolve registry')
  .action(async (input: string[], options: { config?: string; dir?: string }) => {
    const config = await createOrLoadConfig(options.config);
    const client = createClientFromDir(options.dir);
    await add(input, client, config);
  });

registerFeatureCommands(cli, createClientFromDir);

cli
  .command(
    'export <format>',
    'export documentation to various formats (run after production build)',
  )
  .option('--framework <name>', 'framework: next, astro, tanstack-start, react-router, waku')
  .option('--output <path>', 'output file path', { default: 'docs.epub' })
  .action(async (format: string, options: { framework?: string; output: string }) => {
    if (format !== 'epub')
      throw new Error(`unsupported format: ${format}, only \`epub\` is supported.`);
    if (!options.framework) throw new Error('option `--framework <name>` is required.');

    await exportEpub({ framework: options.framework, output: options.output });
  });

cli
  .command(
    'tree [json_or_args] [output]',
    'generate a file tree for the Files component, from a directory or JSON output of `tree`',
  )
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

function createClientFromDir(dir = 'https://fumadocs.dev/registry') {
  if (dir in dirShortcuts) dir = dirShortcuts[dir];

  return dir.startsWith('http://') || dir.startsWith('https://')
    ? new HttpRegistryConnector(dir)
    : new LocalRegistryConnector(dir);
}

cli.help();
cli.version(packageJson.version);

try {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
} catch (e) {
  console.error(picocolors.redBright(e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
