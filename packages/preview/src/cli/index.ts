#!/usr/bin/env node
import { cac } from 'cac';
import { runStart } from './commands.js';
import fs from 'node:fs/promises';
import { findConfigPath } from '@/config/load-node.js';
import { version } from '../../package.json' with { type: 'json' };

const cli = cac('fumadocs-preview');

cli.command('init', 'create configuration file').action(async () => {
  if ((await findConfigPath()) === null) {
    await fs.writeFile(
      'fumadocs.config.ts',
      `import { defineConfig } from "fumadocs-preview/config";\n\nexport default defineConfig();`,
    );

    console.log('note: make sure to install `fumadocs-preview` as a dev dependency too.');
  }
});

cli
  .command('start [...dirs]', 'start Fumapress')
  // run it when no command is given
  .alias('!')
  .option('-p, --port <PORT>', 'port to listen on')
  .option('--host <HOST>', 'host to listen on')
  .action(async (dirs: string[], options: { port?: number; host?: string }) => {
    await runStart({ ...options, dirs });
  });

cli.help();
cli.version(version);

try {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
