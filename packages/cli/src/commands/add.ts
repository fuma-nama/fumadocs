import {
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  spinner,
} from '@clack/prompts';
import picocolors from 'picocolors';
import {
  type ComponentInstaller,
  createComponentInstaller,
  type Resolver,
} from '@/utils/add/install-component';
import { installDeps } from '@/utils/add/install-deps';
import type { LoadedConfig } from '@/config';
import { validateRegistryIndex } from '@/registry/client';

export async function add(
  input: string[],
  resolver: Resolver,
  config: LoadedConfig,
) {
  const installer = createComponentInstaller({
    resolver,
    config,
  });
  let target = input;

  if (input.length === 0) {
    const spin = spinner();
    spin.start('fetching registry');
    const indexes = validateRegistryIndex(
      await resolver('_registry.json').catch((e) => {
        log.error(String(e));
        process.exit(1);
      }),
    );

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
  const dependencies: Record<string, string | null> = {};
  const devDependencies: Record<string, string | null> = {};

  for (const name of target) {
    intro(
      picocolors.bold(
        picocolors.inverse(picocolors.cyanBright(`Add Component: ${name}`)),
      ),
    );

    try {
      const output = await installer.install(name);

      Object.assign(dependencies, output.dependencies);
      Object.assign(devDependencies, output.devDependencies);

      outro(picocolors.bold(picocolors.greenBright(`${name} installed`)));
    } catch (e) {
      log.error(String(e));
      throw e;
    }
  }

  intro(picocolors.bold('New Dependencies'));

  await installDeps(dependencies, devDependencies);

  outro(picocolors.bold(picocolors.greenBright('Successful')));
}
