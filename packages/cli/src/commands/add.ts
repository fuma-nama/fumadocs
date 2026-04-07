import { isCancel, autocompleteMultiselect, outro, spinner } from '@clack/prompts';
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

    async function scan(subRegistry?: string): Promise<AddOption[]> {
      const info = await connector.fetchRegistryInfo(subRegistry);

      return info.indexes.map((item) => ({
        label: item.title ?? item.name,
        value: { name: item.name, subRegistry },
        hint: item.description,
      }));
    }

    spin.stop(picocolors.bold(picocolors.greenBright('registry fetched')));
    const value = await autocompleteMultiselect({
      message: 'Select components to install',
      options: [...(await scan()), ...(await scan(subRegistry))],
    });

    if (isCancel(value)) {
      outro('Ended');
      return;
    }

    targets = value;
  } else {
    targets = await Promise.all(
      input.map(async (item) =>
        (await connector.hasComponent(item)) ? { name: item } : { subRegistry, name: item },
      ),
    );
  }

  for (const target of targets) {
    await installer.installInteractive(target.name, target.subRegistry);
  }

  outro(picocolors.bold(picocolors.greenBright('Successful')));
}
