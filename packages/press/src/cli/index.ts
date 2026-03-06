#!/usr/bin/env node
import { program } from 'commander';
import { runStart } from './commands.js';
import fs from 'node:fs/promises';
import { findConfigPath } from '@/config/load-node.js';
import { version } from 'package.json';

program
  .command('init')
  .description('create configuration file')
  .action(async () => {
    if ((await findConfigPath()) === null) {
      await fs.writeFile(
        'fumapress.config.ts',
        `import { defineConfig } from "fumapress/config";\n\nexport default defineConfig();`,
      );

      console.log('note: make sure to install `fumapress` as a dev dependency too.');
    }
  });

program
  .command('start', { isDefault: true })
  .description('start Fumapress')
  .option('-p, --port <PORT>')
  .option('-h, --host <HOST>')
  .action(async (options: { port?: string; host?: string }) => {
    await runStart(options);
  });

void program.version(version).parseAsync(process.argv);
