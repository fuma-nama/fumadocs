#!/usr/bin/env node
import { program } from 'commander';
import { runStart } from './commands.js';
import fs from 'node:fs/promises';
import { findConfigPath } from '@/config/load-node.js';
import { version } from '../../package.json' with { type: 'json' };

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
  .argument('[dirs...]', 'a list of content directories to view')
  .option('-p, --port <PORT>')
  .option('-h, --host <HOST>')
  .action(async (dirs: string[] | undefined, options: { port?: string; host?: string }) => {
    await runStart({ ...options, dirs });
  });

void program.version(version).parseAsync(process.argv);
