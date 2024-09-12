import { Command } from 'commander';
import picocolors from 'picocolors';
import { isCancel, multiselect, outro } from '@clack/prompts';
import { init } from '@/commands/init';
import { add } from '@/commands/add';
import { initConfig, loadConfig } from '@/config';
import { plugins } from '@/plugins';
import { components } from '@/generated';
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
  .argument('[components...]', 'components to download')
  .option(
    '--branch <string>',
    'the Git branch name of Fumadocs repo to download from (e.g. main)',
  )
  .option('--config <string>')
  .action(
    async (
      str: string[],
      { config, branch }: { config?: string; branch?: string },
    ) => {
      let target = str;

      if (str.length === 0) {
        const value = await multiselect({
          message: 'Select components to install',
          options: components.map((c) => ({
            label: c,
            value: c,
          })),
        });

        if (isCancel(value)) {
          outro('Ended');
          return;
        }

        target = value as string[];
      }

      const loadedConfig = await loadConfig(config);
      for (const name of target) {
        await add(name, branch ?? 'main', loadedConfig);
      }
    },
  );

program.parse();
