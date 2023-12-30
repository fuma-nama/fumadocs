#!/usr/bin/env node
import { existsSync } from 'node:fs';
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
import * as color from 'picocolors';
import packagePackageJson from '../package.json';
import { autoInstall, getPackageManager } from './auto-install';

const cwd = process.cwd();
const sourceDir = path.resolve(__dirname, '../');
const manager = getPackageManager();

async function main(): Promise<void> {
  intro(color.bgCyan(color.bold('Create Next Docs')));

  const options = await group(
    {
      name: () =>
        text({
          message: 'Project name',
          placeholder: 'my-app',
          defaultValue: 'my-app',
        }),
      type: () =>
        select({
          message: 'Choose a content source',
          initialValue: 'next-docs-mdx' as Source,
          options: [
            { value: 'next-docs-mdx', label: 'Next Docs MDX' },
            { value: 'contentlayer', label: 'Contentlayer' },
          ],
        }),
      tailwindcss: () => confirm({ message: 'Use Tailwind CSS for styling?' }),
      autoInstall: () =>
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

  if (existsSync(dest)) {
    const del = await confirm({
      message: `${projectName} already exists, do you want to delete it?`,
    });

    if (isCancel(del)) {
      cancel();
      return;
    }

    if (del) {
      const info = spinner();
      info.start(`Deleting ${projectName}`);

      await fs.rm(dest, {
        recursive: true,
        force: true,
      });

      info.stop(`Deleted ${projectName}`);
    }
  }

  const info = spinner();
  info.start(`Copying files to ${projectName}`);

  await copy(path.join(sourceDir, `template/${options.type}`), dest);
  await copy(
    path.join(sourceDir, 'static/content'),
    path.join(dest, 'content/docs'),
  );

  if (options.tailwindcss) {
    await copy(path.join(sourceDir, `template/+tailwindcss`), dest);
  }

  info.message('Writing package.json');

  const packageJson = createPackageJson(
    projectName,
    options.type,
    options.tailwindcss,
  );
  await fs.writeFile(path.join(dest, 'package.json'), packageJson);

  info.message('Updating README.md');
  const readMe = await getReadme(projectName);

  await fs.writeFile(path.join(dest, 'README.md'), readMe);

  info.message('Adding .gitignore');
  await fs.copyFile(
    path.join(sourceDir, 'static/example.gitignore'),
    path.join(dest, '.gitignore'),
  );

  if (options.autoInstall) {
    info.message('Installing dependencies');
    await autoInstall(manager, dest);
  }

  info.stop('Project Generated');

  outro(color.bgGreen(color.bold('Done')));

  if (options.tailwindcss) {
    console.log('✔ Tailwind CSS');
  }

  console.log('✔ Typescript');

  console.log(color.bold('\nOpen the project'));
  console.log(color.cyan(`cd ${projectName}`));

  console.log(color.bold('\nRun Development Server'));
  console.log(color.cyan('npm run dev | pnpm run dev | yarn dev'));

  console.log(
    color.bold('\nYou can now open the project and start writing documents'),
  );

  process.exit(0);
}

async function getReadme(projectName: string): Promise<string> {
  const template = await fs
    .readFile(path.join(sourceDir, 'static/README.md'))
    .then((res) => res.toString());

  return `# ${projectName}\n\n${template}`;
}

type Source = 'contentlayer' | 'next-docs-mdx';

function createPackageJson(
  name: string,
  source: Source,
  tailwindCss: boolean,
): string {
  const nextDocsVersion = packagePackageJson.version;

  const packageJson = {
    name,
    version: '0.0.0',
    private: true,
    scripts: {
      build: 'next build',
      dev: 'next dev',
      start: 'next start',
    },
    dependencies: {
      next: '14.0.4',
      'next-docs-ui': nextDocsVersion,
      'next-docs-zeta': nextDocsVersion,
      react: '18.2.0',
      'react-dom': '18.2.0',
    },
    devDependencies: {
      '@types/react': '18.2.0',
      '@types/react-dom': '18.2.1',
      typescript: '5.3.3',
    },
  };

  if (source === 'contentlayer') {
    Object.assign(packageJson.dependencies, {
      contentlayer: '0.3.4',
      'next-contentlayer': '0.3.4',
    });

    Object.assign(packageJson, {
      overrides: {
        unified: '^11.0.4',
        'mdx-bundler': '^10.0.1',
      },
    });
  }

  if (source === 'next-docs-mdx') {
    Object.assign(packageJson.dependencies, {
      'next-docs-mdx': nextDocsVersion,
    });
  }

  if (tailwindCss) {
    Object.assign(packageJson.devDependencies, {
      autoprefixer: '10.4.16',
      postcss: '8.4.32',
      tailwindcss: '3.3.7',
    });
  }

  return JSON.stringify(packageJson, undefined, 2);
}

async function copy(
  from: string,
  to: string,
  rename: (s: string) => string = (s) => s,
): Promise<void> {
  const stats = await fs.stat(from);

  if (stats.isDirectory()) {
    const files = await fs.readdir(from);

    await Promise.all(
      files.map((file) =>
        copy(path.join(from, file), path.join(to, rename(file))),
      ),
    );
  } else {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }
}

main().catch((e) => {
  console.error(e);
  throw e;
});
