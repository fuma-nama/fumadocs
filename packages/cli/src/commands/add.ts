import { autocompleteMultiselect, outro, spinner } from '@clack/prompts';
import { canPrompt, isCancel } from '@/utils/prompt';
import { styleText } from 'node:util';
import { UIRegistries } from '@/commands/shared';
import { RegistryConnector } from 'fuma-cli/registry/connector';
import { isFumapress, LoadedConfig } from '@/config';
import { FumadocsComponentInstaller } from '@/registry/installer';

interface AddOption {
  label: string;
  value: Target;
  hint?: string;
}

export interface Target {
  name: string;
  subRegistry?: string;
}

export async function add(input: string[], connector: RegistryConnector, config: LoadedConfig) {
  let targets: Target[];
  const installer = new FumadocsComponentInstaller(connector, config);
  const subRegistry = UIRegistries[config.uiLibrary];
  const fumapress = await isFumapress();

  if (input.length === 0) {
    const spin = spinner();
    spin.start('fetching registry');

    async function scan(subRegistry?: string, prefix?: string): Promise<AddOption[]> {
      const manifest = await installer.fetchManifest(subRegistry);
      const options: AddOption[] = [];

      for (const item of manifest.components) {
        if (item.unlisted) continue;
        options.push({
          label: `${prefix ? `${styleText('bold', prefix)} - ` : ''}${item.title ?? item.name}`,
          value: { name: item.name, subRegistry },
          hint: item.description,
        });
      }
      return options;
    }

    const groups = await Promise.all([
      fumapress ? [] : scan(undefined, 'common'),
      scan('sanity', 'sanity'),
      scan('openapi', 'openapi'),
      scan('api-docs', 'api-docs'),
      scan(subRegistry, 'ui'),
    ]);

    spin.stop(styleText(['bold', 'greenBright'], 'registry fetched'));
    const options = groups.flat();
    if (!canPrompt)
      throw new Error(
        `Pass the components to install, like \`fumadocs add <name>\`: ${options.map((option) => option.value.name).join(', ')}`,
      );
    const value = await autocompleteMultiselect({
      message: 'Select components to install',
      options: options.sort((a, b) => a.label.localeCompare(b.label)),
    });

    if (isCancel(value)) {
      outro('Ended');
      return;
    }

    targets = value;
  } else {
    const root = new Set<string>();
    for (const item of (await installer.fetchManifest()).components) root.add(item.name);
    targets = input.map((name) => {
      if (!root.has(name)) return { subRegistry, name };
      if (fumapress)
        throw new Error(`"${name}" isn't UI, Fumapress has it as a plugin or can't use it.`);
      return { name };
    });
  }

  for (const target of targets) {
    await installer.installInteractive(target.name, target.subRegistry);
  }

  outro(styleText(['bold', 'greenBright'], 'Successful'));
}
