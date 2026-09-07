import type { Command } from 'commander';
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  select,
  spinner,
} from '@clack/prompts';
import picocolors from 'picocolors';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import { createOrLoadConfig } from '@/config';
import { loadProject } from '@/project';
import { type AnyFeature, type FeatureIO, runFeature } from '@/features';
import { features } from '@/features/all';

interface CommandOptions extends Record<string, string | boolean | undefined> {
  config?: string;
  dir?: string;
  yes?: boolean;
  install?: boolean;
}

export function registerFeatureCommands(
  program: Command,
  createConnector: (dir?: string) => RegistryConnector,
) {
  const parent = program.command('feature').description('configure a feature on your project');
  for (const feature of features) register(parent.command(feature.id), feature, createConnector);

  register(
    program
      .command('init')
      .description('set up Fumadocs on an existing app, same as `feature docs`'),
    features[0],
    createConnector,
  );
}

function register(
  command: Command,
  feature: AnyFeature,
  createConnector: (dir?: string) => RegistryConnector,
) {
  command
    .description(feature.description)
    .option('--dir <string>', 'the root url or directory to resolve registry')
    .option('-y, --yes', 'skip prompts, overwrite existing files')
    .option('--no-install', 'write dependencies to package.json without installing');

  for (const [key, option] of Object.entries(feature.options ?? {})) {
    if ('choices' in option) {
      command.option(
        `--${key} <value>`,
        `${option.message} (${option.choices.map((choice) => choice.value).join(', ')})`,
      );
    } else {
      command.option(`--${key}`, option.message);
    }
  }

  command.action(async (options: CommandOptions) => {
    await run(feature, options, createConnector(options.dir));
  });
}

async function run(feature: AnyFeature, options: CommandOptions, connector: RegistryConnector) {
  intro(picocolors.bgBlack(picocolors.whiteBright(feature.title)));
  const config = await createOrLoadConfig(options.config);
  const project = await loadProject(config);
  log.info(`${project.framework}${project.static ? ' (static)' : ''}, ${project.packageManager}`);

  const values: Record<string, unknown> = {};
  for (const [key, option] of Object.entries(feature.options ?? {})) {
    const given = options[key];
    if ('choices' in option) {
      if (given !== undefined) {
        if (!option.choices.some((choice) => choice.value === given))
          throw new Error(`invalid value for --${key}: ${given}`);
        values[key] = given;
        continue;
      }

      const value = await select({ message: option.message, options: option.choices });
      if (isCancel(value)) {
        cancel('Stopped.');
        process.exit(0);
      }
      values[key] = value;
    } else if (given !== undefined || options.yes) {
      values[key] = given === true;
    } else {
      const value = await confirm({ message: option.message, initialValue: option.initialValue });
      if (isCancel(value)) {
        cancel('Stopped.');
        process.exit(0);
      }
      values[key] = value;
    }
  }

  const spin = spinner();
  const io: FeatureIO = {
    installDependencies: options.install !== false,
    log: (message) => spin.message(message),
    async confirmOverwrite(file) {
      if (options.yes) return true;
      spin.clear();
      const value = await confirm({ message: `Overwrite ${file}?`, initialValue: false });
      if (isCancel(value)) {
        cancel('Stopped.');
        process.exit(0);
      }
      spin.start();
      return value;
    },
  };

  spin.start(`Applying ${feature.title}`);
  try {
    const { notes } = await runFeature(feature, values, { project, connector, io });
    spin.stop(`${feature.title} applied`);
    if (notes.length > 0) note(notes.join('\n\n'), 'What is Next?');
  } catch (e) {
    spin.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
  outro(picocolors.bold(picocolors.greenBright('Done')));
}
