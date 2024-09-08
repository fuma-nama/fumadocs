import * as fs from 'node:fs/promises';
import path from 'node:path';
import * as process from 'node:process';
import { execa } from 'execa';
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
import { getPackageManager } from '@/utils/get-package-manager';
import { exists } from '@/utils/fs';
import { isSrc } from '@/utils/is-src';

export interface Plugin {
  dependencies: string[];
  files: Record<string, string>;
  instructions: (
    | {
        type: 'code';
        title?: string;
        code: string;
      }
    | {
        type: 'text';
        text: string;
      }
  )[];
}

export async function add(plugin: Plugin): Promise<void> {
  intro(
    picocolors.bgCyan(picocolors.black(picocolors.bold('Installing Plugins'))),
  );
  const useSrc = await isSrc();

  for (const [name, content] of Object.entries(plugin.files)) {
    const file = useSrc ? path.resolve('./src', name) : name;
    log.step(picocolors.green(`★ Writing ${file}`));

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
    const manager = getPackageManager();

    const value = await confirm({
      message: `This plugin contains additional dependencies, do you want to install them?
Detected as ${manager}`,
    });

    if (isCancel(value)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }

    if (value) {
      const spin = spinner();
      spin.start('Installing dependencies');
      await execa(`${manager} install ${plugin.dependencies.join(' ')}`);
      spin.stop('Successfully installed.');
    }
  }

  for (const text of plugin.instructions) {
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
