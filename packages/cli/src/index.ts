import { Command } from 'commander';
import { ogImagePlugin } from '@/plugins/og-image';
import { add } from '@/commands/add';
import { i18nPlugin } from '@/plugins/i18n';
import packageJson from '../package.json';

const program = new Command();

program
  .name('fumadocs')
  .description('CLI to setup Fumadocs')
  .version(packageJson.version);

program
  .command('add')
  .description('Add a new plugin to your docs')
  .argument('<string>', 'plugin name')
  .action(async (str: string) => {
    if (str === 'og-image') {
      await add(ogImagePlugin);
      return;
    }

    if (str === 'i18n') {
      await add(i18nPlugin);
      return;
    }

    throw new Error(`Plugin not found: ${str}`);
  });

program
  .command('init')
  .description('Initialize Fumadocs on existing Next.js app');

program.parse();
