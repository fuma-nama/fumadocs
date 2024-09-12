import * as process from 'node:process';
import path from 'node:path';
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
import { isSrc } from '@/utils/is-src';
import { type Config } from '@/config';
import {
  getOutputPath,
  toReferencePath,
  transformReferences,
} from '@/utils/transform-references';
import { createEmptyProject } from '@/utils/typescript';

export type Awaitable<T> = T | Promise<T>;

export interface PluginContext extends Config {
  src: boolean;

  /**
   * Original path in `files` - Transformed output path
   */
  outFileMap: Map<string, string>;
}

export interface Plugin {
  dependencies: string[];
  files: (ctx: PluginContext) => Awaitable<Record<string, string>>;
  instructions: (ctx: PluginContext) => Awaitable<
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

  transform?: (ctx: PluginContext) => Awaitable<void>;
}

export async function init(plugin: Plugin, config: Config = {}): Promise<void> {
  intro(
    picocolors.bgCyan(picocolors.black(picocolors.bold('Installing Plugins'))),
  );
  const ctx: PluginContext = {
    src: await isSrc(),
    outFileMap: new Map(),
    ...config,
  };

  const files = await plugin.files(ctx);
  const project = createEmptyProject();

  for (const [name, content] of Object.entries(files)) {
    const file = getOutputPath(name, ctx);
    ctx.outFileMap.set(name, file);

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

    const sourceFile = project.createSourceFile(file, content, {
      overwrite: true,
    });

    await transformReferences(
      sourceFile,
      {
        alias: ctx.src ? 'src' : 'root',
        relativeTo: path.dirname(file),
      },
      (resolved) => {
        if (resolved.type !== 'file') return;

        return toReferencePath(file, getOutputPath(resolved.path, ctx));
      },
    );

    await sourceFile.save();
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
      await plugin.transform(ctx);
      note(
        `You can format the output with Prettier or other code formating tools
prettier . --write`,
        picocolors.bold(picocolors.green('Changes Applied')),
      );
    }
  }

  const instructions = await plugin.instructions(ctx);
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
