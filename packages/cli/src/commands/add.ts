import { intro, isCancel, log, multiselect, outro, spinner } from '@clack/prompts';
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
    const value = await multiselect({
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
    intro(picocolors.bold(picocolors.inverse(picocolors.cyanBright(`Add Component: ${name}`))));

    try {
      await installer.install(name);
      outro(picocolors.bold(picocolors.greenBright(`${name} installed`)));
    } catch (e) {
      log.error(String(e));
      throw e;
    }
  }

  intro(picocolors.bold('New Dependencies'));

  await installer.installDeps();
  await installer.onEnd();

  outro(picocolors.bold(picocolors.greenBright('Successful')));
}
