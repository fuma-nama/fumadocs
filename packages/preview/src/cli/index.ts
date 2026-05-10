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
        'fumadocs.config.ts',
        `import { defineConfig } from "fumadocs-preview/config";\n\nexport default defineConfig();`,
      );

      console.log('note: make sure to install `fumadocs-preview` as a dev dependency too.');
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
