import { Command } from 'commander';
import picocolors from 'picocolors';
import { init } from '@/commands/init';
import { add } from '@/commands/add';
import { initConfig, loadConfig } from '@/config';
import { plugins } from '@/plugins';
import packageJson from '../package.json';

const program = new Command();

program
  .name('fumadocs')
  .description('CLI to setup Fumadocs')
  .version(packageJson.version);

program
  .command('i')
  .description('init a config for Fumadocs CLI')
  .action(async () => {
    await initConfig();
    console.log(picocolors.green('Successful: ./cli.json'));
  });

program
  .command('init')
  .description('init a new plugin to your docs')
  .argument('<string>', 'plugin name')
  .option('--config <string>')
  .action(async (str: string, { config }) => {
    const loadedConfig = await loadConfig(config as string | undefined);
    const plugin = str in plugins ? plugins[str] : undefined;

    if (!plugin) throw new Error(`Plugin not found: ${str}`);

    await init(plugin, loadedConfig);
  });

program
  .command('add')
  .description('add a new component to your docs')
  .argument('<string>', 'component name/path')
  .option('--config <string>')
  .action(async (str: string, { config }) => {
    const loadedConfig = await loadConfig(config as string | undefined);

    await add(str, 'main', loadedConfig);
  });

program.parse();
