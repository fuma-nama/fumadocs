import { Command } from 'commander';
import { ogImagePlugin } from '@/plugins/og-image';
import { init } from '@/commands/init';
import { i18nPlugin } from '@/plugins/i18n';
import { openapiPlugin } from '@/plugins/openapi';
import { add } from '@/commands/add';
import packageJson from '../package.json';

const program = new Command();

program
  .name('fumadocs')
  .description('CLI to setup Fumadocs')
  .version(packageJson.version);

program
  .command('init')
  .description('init a new plugin to your docs')
  .argument('<string>', 'plugin name')
  .action(async (str: string) => {
    if (str === 'og-image') {
      await init(ogImagePlugin);
      return;
    }

    if (str === 'i18n') {
      await init(i18nPlugin);
      return;
    }

    if (str === 'openapi') {
      await init(openapiPlugin);
      return;
    }

    throw new Error(`Plugin not found: ${str}`);
  });

program
  .command('add')
  .description('add a new component to your docs')
  .argument('<string>', 'component name/path')
  .action(async (str: string) => {
    await add(str);
  });

program.parse();
