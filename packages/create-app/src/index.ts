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
import {
  getPackageManager,
  managers,
  type PackageManager,
} from './auto-install';
import { create, type Template, templates } from './create-app';
import { cwd } from './constants';
import { program } from 'commander';

program.argument('[name]', 'the project name');
program.option('--src', '(Next.js only) enable `src/` directory');
program.option('--no-src', '(Next.js only) disable `src/` directory');

program.option('--eslint', '(Next.js only) enable ESLint configuration');
program.option('--no-eslint', '(Next.js only) disable ESLint configuration');

program.option('--install', 'Enable installing packages automatically');
program.option('--no-install', 'Disable installing packages automatically');

program.option('--no-git', 'Disable auto Git repository initialization');

program.option(
  '--template <name>',
  `template to choose: ${templates.join(', ')}`,
  (value) => {
    if (!templates.includes(value as Template)) {
      throw new Error(`Invalid template: ${value}.`);
    }

    return value;
  },
);

program.option(
  '--pm <name>',
  `package manager to choose: ${managers.join(', ')}`,
  (value) => {
    if (!managers.includes(value as PackageManager)) {
      throw new Error(`Invalid package manager: ${value}.`);
    }

    return value;
  },
);

interface Options {
  name?: string;
  src?: boolean;
  eslint?: boolean;
  install?: boolean;
  template?: Template;
  pm?: PackageManager;
  git?: boolean;
}

async function main(config: Options): Promise<void> {
  intro(pc.bgCyan(pc.bold('Create Fumadocs App')));
  const manager = config.pm ?? getPackageManager();

  const options = await group(
    {
      name: () => {
        if (config.name) return Promise.resolve(config.name);

        return text({
          message: 'Project name',
          placeholder: 'my-app',
          defaultValue: 'my-app',
        });
      },
      template: () => {
        if (config.template) return Promise.resolve(config.template);

        return select<Template>({
          message: 'Choose a template',
          initialValue: '+next+fuma-docs-mdx',
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
              value: 'waku',
              label: 'Waku: Fumadocs MDX',
            },
            {
              value: 'react-router',
              label: 'React Router: Fumadocs MDX (not RSC)',
            },
            {
              value: 'tanstack-start',
              label: 'Tanstack Start: Fumadocs MDX (not RSC)',
            },
          ],
        });
      },
      src: (v) => {
        if (!v.results.template?.startsWith('+next')) return;
        if (config.src !== undefined) return Promise.resolve(config.src);

        return confirm({
          message: 'Use `/src` directory?',
          initialValue: false,
        });
      },
      eslint: (v) => {
        if (!v.results.template?.startsWith('+next')) return;
        if (config.eslint !== undefined) return Promise.resolve(config.eslint);

        return confirm({
          message: 'Add default ESLint configuration?',
          initialValue: false,
        });
      },
      installDeps: () => {
        if (config.install !== undefined)
          return Promise.resolve(config.install);

        return confirm({
          message: `Do you want to install packages automatically? (detected as ${manager})`,
        });
      },
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
    initializeGit: config.git,

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

program.parse();

main({
  name: program.args[0],
  ...program.opts(),
}).catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
