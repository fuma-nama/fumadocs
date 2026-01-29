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
import { ComponentInstaller } from '@/registry/installer';
import type { RegistryClient } from '@/registry/client';
import { UIRegistries } from '@/commands/shared';

export async function add(input: string[], client: RegistryClient) {
  const config = client.config;
  let target: string[];
  const installer = new ComponentInstaller(client);
  const registry = UIRegistries[config.uiLibrary];

  if (input.length === 0) {
    const spin = spinner();
    spin.start('fetching registry');
    const info = await client.fetchRegistryInfo();
    const options: {
      label: string;
      value: string;
      hint?: string;
    }[] = [];

    for (const item of info.indexes) {
      options.push({
        label: item.title ?? item.name,
        value: item.name,
        hint: item.description,
      });
    }
    const { indexes } = await client.createLinkedRegistryClient(registry).fetchRegistryInfo();

    for (const item of indexes) {
      options.push({
        label: item.title ?? item.name,
        value: `${registry}/${item.name}`,
        hint: item.description,
      });
    }

    spin.stop(picocolors.bold(picocolors.greenBright('registry fetched')));
    const value = await autocompleteMultiselect({
      message: 'Select components to install',
      options,
    });

    if (isCancel(value)) {
      outro('Ended');
      return;
    }

    target = value;
  } else {
    target = await Promise.all(
      input.map(async (item) => ((await client.hasComponent(item)) ? item : `${registry}/${item}`)),
    );
  }

  await install(target, installer);
}

export async function install(target: string[], installer: ComponentInstaller) {
  for (const name of target) {
    const spin = spinner();
    spin.start(picocolors.bold(picocolors.cyanBright(`Installing ${name}`)));

    try {
      await installer.install(name, {
        onWarn(message) {
          spin.message(message);
        },
        async confirmFileOverride(options) {
          spin.clear();
          const value = await confirm({
            message: `Do you want to override ${options.path}?`,
            initialValue: false,
          });
          if (isCancel(value)) {
            outro('Installation terminated');
            process.exit(0);
          }
          spin.start(picocolors.bold(picocolors.cyanBright(`Installing ${name}`)));
          return value;
        },
        onFileDownloaded(options) {
          spin.message(options.path);
        },
      });
      spin.stop(picocolors.bold(picocolors.greenBright(`${name} installed`)));
    } catch (e) {
      spin.error(e instanceof Error ? e.message : String(e));
      process.exit(-1);
    }
  }

  const deps = await installer.deps();
  if (deps.hasRequired()) {
    log.message();
    box([...deps.dependencies, ...deps.devDependencies].join('\n'), 'New Dependencies');
    const value = await confirm({
      message: `Do you want to install with ${deps.packageManager}?`,
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
      await deps.installRequired();
      spin.stop('Dependencies installed');
    }
  }

  await installer.onEnd();
  outro(picocolors.bold(picocolors.greenBright('Successful')));
}
