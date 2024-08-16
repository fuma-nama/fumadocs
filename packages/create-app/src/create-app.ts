import path from 'node:path';
import fs from 'node:fs/promises';
import { tryGitInit } from '@/git';
import localVersions from '../versions.json';
import versionPkg from '../../create-app-versions/package.json';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import { sourceDir, cwd } from './constants';

export type Template = 'content-collections' | 'fuma-docs-mdx';

export interface Options {
  outputDir: string;
  template: Template;
  tailwindcss: boolean;
  packageManager: PackageManager;

  installDeps?: boolean;
  initializeGit?: boolean;
  log?: (message: string) => void;
}

export async function create(options: Options): Promise<void> {
  const {
    installDeps = true,
    initializeGit = true,
    log = console.log,
  } = options;
  const projectName = path.basename(options.outputDir);
  const dest = path.resolve(cwd, options.outputDir);
  await copy(path.join(sourceDir, `template/+shared`), dest, (name) => {
    switch (name) {
      case 'example.gitignore':
        return '.gitignore';
      default:
        return name;
    }
  });

  await copy(path.join(sourceDir, `template/${options.template}`), dest);
  log('Configured Typescript');

  if (options.tailwindcss) {
    await copy(path.join(sourceDir, `template/+tailwindcss`), dest);
    log('Configured Tailwind CSS');
  }

  const packageJson = createPackageJson(projectName, options);
  await fs.writeFile(path.join(dest, 'package.json'), packageJson);

  const readMe = await getReadme(dest, projectName);
  await fs.writeFile(path.join(dest, 'README.md'), readMe);

  if (installDeps) {
    await autoInstall(options.packageManager, dest);
    log('Installed dependencies');
  }

  if (initializeGit && tryGitInit(dest)) {
    log('Initialized Git repository');
  }
}

async function getReadme(dest: string, projectName: string): Promise<string> {
  const template = await fs
    .readFile(path.join(dest, 'README.md'))
    .then((res) => res.toString());

  return `# ${projectName}\n\n${template}`;
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

function createPackageJson(
  projectName: string,
  { template, tailwindcss }: Options,
): string {
  const packageJson = {
    name: projectName,
    version: '0.0.0',
    private: true,
    scripts: {
      build: 'next build',
      dev: 'next dev',
      start: 'next start',
    },
    dependencies: {
      next: versionPkg.dependencies.next,
      'fumadocs-ui': localVersions['fumadocs-ui'],
      'fumadocs-core': localVersions['fumadocs-core'],
      react: versionPkg.dependencies.react,
      'react-dom': versionPkg.dependencies['react-dom'],
    },
    devDependencies: {
      '@types/node': versionPkg.dependencies['@types/node'],
      '@types/react': versionPkg.dependencies['@types/react'],
      '@types/react-dom': versionPkg.dependencies['@types/react-dom'],
      typescript: versionPkg.dependencies.typescript,
    },
  };

  if (template === 'content-collections') {
    Object.assign(packageJson.dependencies, {
      '@fumadocs/content-collections':
        localVersions['@fumadocs/content-collections'],
      '@content-collections/core':
        versionPkg.dependencies['@content-collections/core'],
      '@content-collections/mdx':
        versionPkg.dependencies['@content-collections/mdx'],
      '@content-collections/next':
        versionPkg.dependencies['@content-collections/next'],
    });
  }

  if (template === 'fuma-docs-mdx') {
    Object.assign(packageJson.dependencies, {
      'fumadocs-mdx': localVersions['fumadocs-mdx'],
    });

    Object.assign(packageJson.devDependencies, {
      '@types/mdx': versionPkg.dependencies['@types/mdx'],
    });
  }

  if (tailwindcss) {
    Object.assign(packageJson.devDependencies, {
      autoprefixer: versionPkg.dependencies.autoprefixer,
      postcss: versionPkg.dependencies.postcss,
      tailwindcss: versionPkg.dependencies.tailwindcss,
    });
  }

  return JSON.stringify(packageJson, undefined, 2);
}
