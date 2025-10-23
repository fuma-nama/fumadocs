import path from 'node:path';
import fs from 'node:fs/promises';
import { copy, tryGitInit } from '@/utils';
import { versions as localVersions } from '@/versions';
import versionPkg from '../../create-app-versions/package.json';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import { cwd, sourceDir } from './constants';

export const templates = [
  '+next+fuma-docs-mdx',
  'react-router',
  'react-router-spa',
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
    await copy(path.join(sourceDir, `template/${template}`), dest, {
      rename: defaultRename,
    });

    // optional ESLint configuration
    if (lint) {
      await copy(path.join(sourceDir, `template/+next+${lint}`), dest, {
        rename: defaultRename,
      });
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
    await copy(path.join(sourceDir, `template/${template}`), dest, {
      rename: defaultRename,
    });
  }

  const packageJson = await createPackageJson(projectName, dest, options);
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

async function createPackageJson(
  projectName: string,
  dir: string,
  { template, lint }: Required<Options>,
): Promise<object> {
  function replaceWorkspaceDeps(deps: Record<string, string>) {
    for (const k in deps) {
      if (deps[k].startsWith('workspace:') && k in localVersions) {
        deps[k] = localVersions[k as keyof typeof localVersions];
      }
    }

    return deps;
  }

  let packageJson = JSON.parse(
    await fs
      .readFile(path.join(dir, 'package.json'))
      .then((res) => res.toString()),
  );

  packageJson = {
    name: projectName,
    ...packageJson,
    dependencies: replaceWorkspaceDeps(packageJson.dependencies),
    devDependencies: replaceWorkspaceDeps(packageJson.devDependencies),
  };

  if (template === '+next+fuma-docs-mdx') {
    packageJson = {
      ...packageJson,
      scripts: {
        ...packageJson.scripts,
        postinstall: 'fumadocs-mdx',
        ...(lint &&
          {
            eslint: {
              lint: 'eslint',
            },
            biome: { lint: 'biome check', format: 'biome format --write' },
          }[lint]),
      },
      devDependencies: {
        ...packageJson.devDependencies,
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

  return packageJson;
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
