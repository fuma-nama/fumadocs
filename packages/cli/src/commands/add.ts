import {
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  spinner,
} from '@clack/prompts';
import picocolors from 'picocolors';
import { ComponentInstaller } from '@/registry/installer';
import type { LoadedConfig } from '@/config';
import { RegistryClient, type Resolver } from '@/registry/client';

export async function add(
  input: string[],
  resolver: Resolver,
  config: LoadedConfig,
) {
  const client = new RegistryClient(config, resolver);
  const installer = new ComponentInstaller(client);
  let target = input;

  if (input.length === 0) {
    const spin = spinner();
    spin.start('fetching registry');
    const indexes = await client.fetchRegistryIndexes();
    spin.stop(picocolors.bold(picocolors.greenBright('registry fetched')));

    const value = await multiselect({
      message: 'Select components to install',
      options: indexes.map((item) => ({
        label: item.title,
        value: item.name,
        hint: item.description,
      })),
    });

    if (isCancel(value)) {
      outro('Ended');
      return;
    }

    target = value;
  }

  await install(target, installer);
}

export async function install(target: string[], installer: ComponentInstaller) {
  for (const name of target) {
    intro(
      picocolors.bold(
        picocolors.inverse(picocolors.cyanBright(`Add Component: ${name}`)),
      ),
    );

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
