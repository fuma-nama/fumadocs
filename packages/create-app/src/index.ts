#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  cancel,
  confirm,
  group,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import pc from 'picocolors';
import { getPackageManager } from './auto-install';
import { type Template, create } from './create-app';
import { cwd } from './constants';

const manager = getPackageManager();

async function main(): Promise<void> {
  intro(pc.bgCyan(pc.bold('Create Fumadocs App')));

  const options = await group(
    {
      name: () =>
        text({
          message: 'Project name',
          placeholder: 'my-app',
          defaultValue: 'my-app',
        }),
      template: () =>
        select({
          message: 'Choose a template',
          initialValue: '+next+fuma-docs-mdx' as Template,
          options: [
            {
              value: '+next+fuma-docs-mdx',
              label: 'Next.js: Fumadocs MDX',
              hint: 'recommended',
            },
            {
              value: '+next+content-collections',
              label: 'Next.js: Content Collections',
            },
            {
              value: 'react-router',
              label: 'React Router: MDX Remote',
            },
            {
              value: 'tanstack-start',
              label: 'Tanstack Start: MDX Remote',
              hint: 'Experimental',
            },
          ],
        }),
      src: (v) => {
        if (!v.results.template?.startsWith('+next')) return;

        return confirm({
          message: 'Use `/src` directory?',
          initialValue: false,
        });
      },
      eslint: (v) => {
        if (!v.results.template?.startsWith('+next')) return;

        return confirm({
          message: 'Add default ESLint configuration?',
          initialValue: false,
        });
      },
      installDeps: () =>
        confirm({
          message: `Do you want to install packages automatically? (detected as ${manager})`,
        }),
    },
    {
      onCancel: () => {
        cancel('Installation Stopped.');
        process.exit(0);
      },
    },
  );

  const projectName = options.name.toLowerCase().replace(/\s/, '-');
  const dest = path.resolve(cwd, projectName);

  const destDir = await fs.readdir(dest).catch(() => null);
  if (destDir && destDir.length > 0) {
    const del = await confirm({
      message: `directory ${projectName} already exists, do you want to delete its files?`,
    });

    if (isCancel(del)) {
      cancel();
      return;
    }

    if (del) {
      const info = spinner();
      info.start(`Deleting files in ${projectName}`);

      await Promise.all(
        destDir.map((item) => {
          return fs.rm(path.join(dest, item), {
            recursive: true,
            force: true,
          });
        }),
      );

      info.stop(`Deleted files in ${projectName}`);
    }
  }

  const info = spinner();
  info.start(`Generating Project`);

  await create({
    packageManager: manager,
    tailwindcss: true,
    template: options.template,
    outputDir: dest,
    installDeps: options.installDeps,
    eslint: options.eslint === true,
    useSrcDir: options.src === true,

    log: (message) => {
      info.message(message);
    },
  });

  info.stop('Project Generated');

  outro(pc.bgGreen(pc.bold('Done')));

  console.log(pc.bold('\nOpen the project'));
  console.log(pc.cyan(`cd ${projectName}`));

  console.log(pc.bold('\nRun Development Server'));
  console.log(pc.cyan('npm run dev | pnpm run dev | yarn dev'));

  console.log(
    pc.bold('\nYou can now open the project and start writing documents'),
  );

  process.exit(0);
}

main().catch((e: unknown) => {
  console.error(e);
  throw e;
});
