import {
  intro,
  isCancel,
  log,
  multiselect,
  outro,
  spinner,
} from '@clack/prompts';
import type { OutputComponent, OutputIndex } from '@/build';
import picocolors from 'picocolors';
import type { Config } from '@/config';
import { installComponent, type Resolver } from '@/utils/add/install-component';
import { installDeps } from '@/utils/add/install-deps';

export async function add(input: string[], resolver: Resolver, config: Config) {
  let target = input;

  if (input.length === 0) {
    const spin = spinner();
    spin.start('fetching registry');
    const registry = (await resolver('_registry.json')) as
      | OutputIndex[]
      | undefined;
    spin.stop(picocolors.bold(picocolors.greenBright('registry fetched')));

    if (!registry) {
      log.error(`Failed to fetch '_registry.json' file from registry`);
      throw new Error(`Failed to fetch registry`);
    }

    const value = await multiselect({
      message: 'Select components to install',
      options: registry.map((item) => ({
        label: item.name,
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

  await install(target, resolver, config);
}

export async function install(
  target: string[],
  resolver: Resolver,
  config: Config,
) {
  const outputs: OutputComponent[] = [];

  for (const name of target) {
    intro(
      picocolors.bold(
        picocolors.inverse(picocolors.cyanBright(`Add Component: ${name}`)),
      ),
    );

    const output = await installComponent(name, resolver, config);
    if (!output) {
      log.error(`Failed to install ${name}: not found`);
      continue;
    }

    outro(picocolors.bold(picocolors.greenBright(`${name} installed`)));
    outputs.push(output);
  }

  intro(picocolors.bold('New Dependencies'));

  await installDeps(outputs);

  outro(picocolors.bold(picocolors.greenBright('Successful')));
}
