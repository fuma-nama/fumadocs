import {
  isCancel,
  autocompleteMultiselect,
  outro,
  spinner,
  confirm,
  box,
  log,
} from '@clack/prompts';
import picocolors from 'picocolors';
import { UIRegistries } from '@/commands/shared';
import { detect } from 'package-manager-detector';
import { RegistryConnector } from 'fuma-cli/registry/connector';
import { LoadedConfig } from '@/config';
import { FumadocsComponentInstaller } from '@/registry/utils';

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

  await install(targets, installer);
}

export async function install(targets: Target[], installer: FumadocsComponentInstaller) {
  for (const target of targets) {
    const spin = spinner();
    spin.start(picocolors.bold(picocolors.cyanBright(`Installing ${target.name}`)));

    try {
      installer.installing = { name: target.name, spin };
      const deps = await installer
        .install(target.name, target.subRegistry)
        .then((res) => res.deps());
      spin.stop(picocolors.bold(picocolors.greenBright(`${target.name} installed`)));

      if (deps.hasRequired()) {
        log.message();
        box([...deps.dependencies, ...deps.devDependencies].join('\n'), 'New Dependencies');
        const pm = (await detect())?.name ?? 'npm';
        const value = await confirm({
          message: `Do you want to install with ${pm}?`,
        });

        if (isCancel(value)) {
          outro('Installation terminated');
          process.exit(0);
        }

        if (value) {
          const spin = spinner({
            errorMessage: 'Failed to install dependencies',
          });
          spin.start('Installing dependencies');
          await deps.installRequired(pm);
          spin.stop('Dependencies installed');
        } else {
          await deps.writeRequired();
        }
      }
    } catch (e) {
      spin.error(e instanceof Error ? e.message : String(e));
      process.exit(-1);
    }
  }

  outro(picocolors.bold(picocolors.greenBright('Successful')));
}
