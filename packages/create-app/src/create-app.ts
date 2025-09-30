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
   * (Next.js only) Create files inside `src`
   * @defaultValue false
   */
  useSrcDir?: boolean;

  /**
   * (Next.js only) Configure Tailwind CSS
   * @defaultValue true
   */
  tailwindcss?: boolean;

  /**
   * (Next.js Only) Configure Lint
   * @defaultValue false
   */
  lint?: 'eslint' | 'biome' | false;

  installDeps?: boolean;
  initializeGit?: boolean;
  log?: (message: string) => void;
}

function defaults(options: Options): Required<Options> {
  return {
    ...options,
    useSrcDir: options.useSrcDir ?? false,
    tailwindcss: options.tailwindcss ?? true,
    lint: options.lint ?? false,
    initializeGit: options.initializeGit ?? false,
    installDeps: options.installDeps ?? false,
    log: console.log,
  };
}

export async function create(createOptions: Options): Promise<void> {
  const options = defaults(createOptions);
  const {
    outputDir,
    useSrcDir,
    log,
    installDeps,
    template,
    lint,
    initializeGit,
    packageManager,
    tailwindcss,
  } = options;

  const projectName = path.basename(outputDir);
  const dest = path.resolve(cwd, outputDir);
  const isNext = options.template.startsWith('+next');

  function isRelative(dir: string, file: string) {
    return !path
      .relative(path.join(dest, dir), file)
      .startsWith(`..${path.sep}`);
  }

  function defaultRename(file: string): string {
    file = file.replace('example.gitignore', '.gitignore');

    if (!useSrcDir || !isNext) {
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
      path.join(sourceDir, `template/${template}`),
      dest,
      defaultRename,
    );

    // optional Tailwind CSS configuration
    if (tailwindcss) {
      await copy(
        path.join(sourceDir, `template/+next+tailwindcss`),
        dest,
        defaultRename,
      );

      log('Configured Tailwind CSS');
    }

    // optional ESLint configuration
    if (lint) {
      await copy(
        path.join(sourceDir, `template/+next+${lint}`),
        dest,
        defaultRename,
      );
      log('Configured Linter');
    }

    // update tsconfig.json for src dir
    if (useSrcDir) {
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
      path.join(sourceDir, `template/${template}`),
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
      await autoInstall(packageManager, dest);
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
  { template, lint, tailwindcss }: Required<Options>,
): Promise<object> {
  return {
    name: projectName,
    version: '0.0.0',
    private: true,
    scripts: {
      build: 'next build',
      dev: 'next dev --turbo',
      start: 'next start',
      ...(template === '+next+fuma-docs-mdx' && {
        postinstall: 'fumadocs-mdx',
      }),
      ...(lint &&
        {
          eslint: {
            lint: 'eslint',
          },
          biome: { lint: 'biome check', format: 'biome format --write' },
        }[lint]),
    },
    dependencies: {
      ...pick(versionPkg.dependencies, [
        'next',
        'react',
        'react-dom',
        'lucide-react',
      ]),
      ...pick(localVersions, ['fumadocs-ui', 'fumadocs-core']),
      ...{
        '+next+content-collections': {
          ...pick(versionPkg.dependencies, [
            '@content-collections/mdx',
            '@content-collections/core',
            '@content-collections/next',
          ]),
          ...pick(localVersions, ['@fumadocs/content-collections']),
        },
        '+next+fuma-docs-mdx': pick(localVersions, ['fumadocs-mdx']),
        waku: null,
        'tanstack-start': null,
        'react-router': null,
      }[template],
    },
    devDependencies: {
      ...pick(versionPkg.dependencies, [
        '@types/node',
        '@types/react',
        '@types/react-dom',
        'typescript',
        '@types/mdx',
      ]),
      ...(tailwindcss &&
        pick(versionPkg.dependencies, [
          '@tailwindcss/postcss',
          'tailwindcss',
          'postcss',
        ])),
      ...(lint &&
        {
          eslint: {
            eslint: '^9',
            'eslint-config-next': versionPkg.dependencies.next,
            '@eslint/eslintrc': '^3',
          },
          biome: pick(versionPkg.dependencies, ['@biomejs/biome']),
        }[lint]),
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
