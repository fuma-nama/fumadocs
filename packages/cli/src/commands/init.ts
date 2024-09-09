import * as fs from 'node:fs/promises';
import path from 'node:path';
import * as process from 'node:process';
import {
  intro,
  confirm,
  isCancel,
  cancel,
  spinner,
  log,
  note,
} from '@clack/prompts';
import picocolors from 'picocolors';
import { sync } from 'cross-spawn';
import { getPackageManager } from '@/utils/get-package-manager';
import { exists } from '@/utils/fs';
import { isSrc, resolveAppPath } from '@/utils/is-src';

type Awaitable<T> = T | Promise<T>;

export interface Plugin {
  dependencies: string[];
  files: (src: boolean) => Awaitable<Record<string, string>>;
  instructions: (src: boolean) => Awaitable<
    (
      | {
          type: 'code';
          title?: string;
          code: string;
        }
      | {
          type: 'text';
          text: string;
        }
    )[]
  >;

  transform?: (src: boolean) => Awaitable<void>;
}

export async function init(plugin: Plugin): Promise<void> {
  intro(
    picocolors.bgCyan(picocolors.black(picocolors.bold('Installing Plugins'))),
  );
  const useSrc = await isSrc();
  const files = await plugin.files(useSrc);

  for (const [name, content] of Object.entries(files)) {
    const file = resolveAppPath(name, useSrc);
    log.step(picocolors.green(`Writing ${file} ★`));

    if (await exists(file)) {
      const value = await confirm({
        message: `${file} already exists`,
        active: 'Override',
        inactive: 'Skip',
      });

      if (isCancel(value)) {
        cancel('Operation cancelled.');
        process.exit(0);
      }

      if (!value) continue;
    }

    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  }

  if (plugin.dependencies.length > 0) {
    const manager = await getPackageManager();

    const value = await confirm({
      message: `This plugin contains additional dependencies, do you want to install them? (detected: ${manager})`,
    });

    if (isCancel(value)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    if (value) {
      const spin = spinner();
      spin.start('Installing dependencies');
      sync(`${manager} install ${plugin.dependencies.join(' ')}`, {
        stdio: 'ignore',
      });
      spin.stop('Successfully installed.');
    }
  }

  if (plugin.transform) {
    const value = await confirm({
      message:
        'This plugin contains changes to your files, do you want to apply them?',
    });

    if (isCancel(value)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    if (value) {
      await plugin.transform(useSrc);
      note(
        `You can format the output with Prettier or other code formating tools
prettier . --write`,
        picocolors.bold(picocolors.green('Changes Applied')),
      );
    }
  }

  const instructions = await plugin.instructions(useSrc);
  for (const text of instructions) {
    if (text.type === 'text') {
      log.message(text.text, {
        symbol: '○',
      });
    }

    if (text.type === 'code') {
      note(text.code, text.title);
    }
  }
}
