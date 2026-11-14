import type { CAC, Command } from 'cac';
import { cancel, confirm, intro, log, note, outro, select, spinner } from '@clack/prompts';
import { canPrompt, isCancel } from '@/utils/prompt';
import { styleText } from 'node:util';
import type { RegistryConnector } from 'fuma-cli/registry/connector';
import { createOrLoadConfig } from '@/config';
import { loadProject } from '@/project';
import { type AnyFeature, assertSupported, type FeatureIO, runFeature } from '@/features';
import { features } from '@/features/all';

interface CommandOptions extends Record<string, string | boolean | undefined> {
  config?: string;
  dir?: string;
  yes?: boolean;
  install?: boolean;
}

export function registerFeatureCommands(
  cli: CAC,
  createConnector: (dir?: string) => RegistryConnector,
) {
  const ids = features.map((feature) => feature.id).join(', ');

  register(
    cli.command('feature <id>', `configure a feature on your project (${ids})`),
    features,
  ).action(async (id: string, options: CommandOptions) => {
    const feature = features.find((item) => item.id === id);
    if (!feature) throw new Error(`unknown feature: ${id}, available: ${ids}`);

    await run(feature, options, createConnector(options.dir));
  });

  register(cli.command('init', 'set up Fumadocs on an existing app, same as `feature docs`'), [
    features[0],
  ]).action(async (options: CommandOptions) => {
    await run(features[0], options, createConnector(options.dir));
  });
}

function register(command: Command, list: AnyFeature[]) {
  command
    .option('--dir <string>', 'the root url or directory to resolve registry')
    .option('-y, --yes', 'skip prompts, overwrite existing files')
    .option('--no-install', 'write dependencies to package.json without installing');

  for (const feature of list) {
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
  }

  return command;
}

async function run(feature: AnyFeature, options: CommandOptions, connector: RegistryConnector) {
  intro(styleText(['bgBlack', 'whiteBright'], feature.title));
  const config = await createOrLoadConfig(options.config);
  const project = await loadProject(config);
  log.info(`${project.framework}${project.static ? ' (static)' : ''}, ${project.packageManager}`);
  assertSupported(feature, project);

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

      if (!canPrompt)
        throw new Error(
          `--${key} is required without a terminal: ${option.choices.map((choice) => choice.value).join(', ')}`,
        );
      const value = await select({ message: option.message, options: option.choices });
      if (isCancel(value)) {
        cancel('Stopped.');
        process.exit(0);
      }
      values[key] = value;
    } else if (given !== undefined) {
      values[key] = given === true;
    } else if (options.yes || !canPrompt) {
      values[key] = option.initialValue ?? false;
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
      if (!canPrompt) {
        log.warn(`Kept ${file}, pass --yes to overwrite it.`);
        spin.start();
        return false;
      }
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
  outro(styleText(['bold', 'greenBright'], 'Done'));
}
