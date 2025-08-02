import path from 'node:path';
import fs from 'node:fs/promises';
import { tryGitInit } from '@/git';
import { versions as localVersions } from '@/versions';
import versionPkg from '../../create-app-versions/package.json';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import { cwd, sourceDir } from './constants';

export const templates = [
  '+next+content-collections',
  '+next+fuma-docs-mdx',
  'react-router',
  'tanstack-start',
  'waku',
] as const;

export type Template = (typeof templates)[number];
export interface Options {
  outputDir: string;
  template: Template;

  /**
   * the package manager to use
   */
  packageManager: PackageManager;

  /**
   * Create files inside `src`
   *
   * (Next.js only)
   */
  useSrcDir?: boolean;

  /**
   * Configure Tailwind CSS
   *
   * (Next.js only)
   */
  tailwindcss: boolean;

  /**
   * Configure Next.js ESLint plugin
   *
   * (Next.js only)
   */
  eslint?: boolean;

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
  const isNext = options.template.startsWith('+next');

  function isRelative(dir: string, file: string) {
    return !path
      .relative(path.join(dest, dir), file)
      .startsWith(`..${path.sep}`);
  }

  function defaultRename(file: string): string {
    file = file.replace('example.gitignore', '.gitignore');

    if (!options.useSrcDir || !isNext) {
      return file;
    }

    if (
      path.basename(file) === 'mdx-components.tsx' ||
      isRelative('app', file) ||
      isRelative('lib', file)
    ) {
      return path.join(dest, 'src', path.relative(dest, file));
    }

    return file;
  }

  if (isNext) {
    await copy(path.join(sourceDir, `template/+next`), dest, defaultRename);

    await copy(
      path.join(sourceDir, `template/${options.template}`),
      dest,
      defaultRename,
    );

    // optional Tailwind CSS configuration
    if (options.tailwindcss) {
      await copy(
        path.join(sourceDir, `template/+next+tailwindcss`),
        dest,
        defaultRename,
      );

      log('Configured Tailwind CSS');
    }

    // optional ESLint configuration
    if (options.eslint) {
      await copy(
        path.join(sourceDir, `template/+next+eslint`),
        dest,
        defaultRename,
      );
      log('Configured ESLint');
    }

    // update tsconfig.json for src dir
    if (options.useSrcDir) {
      const tsconfigPath = path.join(dest, 'tsconfig.json');
      const content = (await fs.readFile(tsconfigPath)).toString();

      const config = JSON.parse(content);

      if (config.compilerOptions?.paths) {
        Object.assign(config.compilerOptions.paths, {
          '@/*': ['./src/*'],
        });
      }

      await fs.writeFile(tsconfigPath, JSON.stringify(config, null, 2));
    }
  } else {
    await copy(
      path.join(sourceDir, `template/${options.template}`),
      dest,
      defaultRename,
    );
  }

  const packageJson = isNext
    ? await createNextPackageJson(projectName, options)
    : await createPackageJson(projectName, dest);
  await fs.writeFile(
    path.join(dest, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  const readMe = await getReadme(dest, projectName);
  await fs.writeFile(path.join(dest, 'README.md'), readMe);

  if (installDeps) {
    try {
      await autoInstall(options.packageManager, dest);
      log('Installed dependencies');
    } catch (err) {
      log(`Failed to install dependencies: ${err}`);
    }
  }

  if (initializeGit && (await tryGitInit(dest))) {
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
        copy(path.join(from, file), rename(path.join(to, file))),
      ),
    );
  } else {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }
}

async function createNextPackageJson(
  projectName: string,
  options: Options,
): Promise<object> {
  return {
    name: projectName,
    version: '0.0.0',
    private: true,
    scripts: {
      build: 'next build',
      dev: 'next dev --turbo',
      start: 'next start',
      ...(options.template === '+next+fuma-docs-mdx'
        ? {
            postinstall: 'fumadocs-mdx',
          }
        : null),
    },
    dependencies: {
      ...pick(versionPkg.dependencies, ['next', 'react', 'react-dom']),
      ...pick(localVersions, ['fumadocs-ui', 'fumadocs-core']),
      ...(options.template === '+next+content-collections'
        ? {
            ...pick(versionPkg.dependencies, [
              '@content-collections/mdx',
              '@content-collections/core',
              '@content-collections/next',
            ]),
            ...pick(localVersions, ['@fumadocs/content-collections']),
          }
        : null),
      ...(options.template === '+next+fuma-docs-mdx'
        ? pick(localVersions, ['fumadocs-mdx'])
        : null),
    },
    devDependencies: {
      ...pick(versionPkg.dependencies, [
        '@types/node',
        '@types/react',
        '@types/react-dom',
        'typescript',
        '@types/mdx',
      ]),
      ...(options.tailwindcss
        ? pick(versionPkg.dependencies, [
            '@tailwindcss/postcss',
            'tailwindcss',
            'postcss',
          ])
        : null),
      ...(options.eslint
        ? {
            eslint: '^8',
            'eslint-config-next': versionPkg.dependencies.next,
          }
        : null),
    },
  };
}

async function createPackageJson(
  projectName: string,
  dir: string,
): Promise<object> {
  function replaceWorkspaceDeps(deps: Record<string, string>) {
    for (const k in deps) {
      if (deps[k].startsWith('workspace:') && k in localVersions) {
        deps[k] = localVersions[k as keyof typeof localVersions];
      }
    }

    return deps;
  }

  const packageJson = JSON.parse(
    await fs
      .readFile(path.join(dir, 'package.json'))
      .then((res) => res.toString()),
  );

  return {
    name: projectName,
    ...packageJson,
    dependencies: replaceWorkspaceDeps(packageJson.dependencies),
    devDependencies: replaceWorkspaceDeps(packageJson.devDependencies),
  };
}

function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result: Partial<T> = {};

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result as Pick<T, K>;
}
