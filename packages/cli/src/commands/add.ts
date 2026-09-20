import { autocompleteMultiselect, outro, spinner } from '@clack/prompts';
import { isCancel } from '@/utils/prompt';
import picocolors from 'picocolors';
import { UIRegistries } from '@/commands/shared';
import { RegistryConnector } from 'fuma-cli/registry/connector';
import { LoadedConfig } from '@/config';
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

  if (input.length === 0) {
    const spin = spinner();
    spin.start('fetching registry');

    async function scan(subRegistry?: string, prefix?: string): Promise<AddOption[]> {
      const manifest = await installer.fetchManifest(subRegistry);
      const options: AddOption[] = [];

      for (const item of manifest.components) {
        if (item.unlisted) continue;
        options.push({
          label: `${prefix ? `${picocolors.bold(prefix)} - ` : ''}${item.title ?? item.name}`,
          value: { name: item.name, subRegistry },
          hint: item.description,
        });
      }
      return options;
    }

    const groups = await Promise.all([
      scan(undefined, 'common'),
      scan('sanity', 'sanity'),
      scan('openapi', 'openapi'),
      scan('api-docs', 'api-docs'),
      scan(subRegistry, 'ui'),
    ]);

    spin.stop(picocolors.bold(picocolors.greenBright('registry fetched')));
    const value = await autocompleteMultiselect({
      message: 'Select components to install',
      options: groups.flat().sort((a, b) => a.label.localeCompare(b.label)),
    });

    if (isCancel(value)) {
      outro('Ended');
      return;
    }

    targets = value;
  } else {
    const root = new Set<string>();
    for (const item of (await installer.fetchManifest()).components) root.add(item.name);
    targets = input.map((name) => (root.has(name) ? { name } : { subRegistry, name }));
  }

  for (const target of targets) {
    await installer.installInteractive(target.name, target.subRegistry);
  }

  outro(picocolors.bold(picocolors.greenBright('Successful')));
}
