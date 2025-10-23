import path from 'node:path';
import fs from 'node:fs/promises';
import { copy, tryGitInit } from '@/utils';
import { versions as localVersions } from '@/versions';
import versionPkg from '../../create-app-versions/package.json';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import { cwd, sourceDir, TemplateInfo, templates } from './constants';

export type Template = (typeof templates)[number]['value'];
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
  plugins?: TemplatePlugin[];
}

export interface TemplatePluginContext {
  template: TemplateInfo;

  options: Required<Options>;
  /**
   * output directory
   */
  dest: string;
}

export interface TemplatePlugin {
  afterWrite?: (context: TemplatePluginContext) => Promise<void>;
}

function defaults(options: Options): Required<Options> {
  return {
    ...options,
    plugins: options.plugins ?? [],
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
    plugins,
  } = options;

  const projectName = path.basename(outputDir);
  const dest = path.resolve(cwd, outputDir);
  const isNext = options.template.startsWith('+next');
  const pluginContext: TemplatePluginContext = {
    template: templates.find((item) => item.value === template)!,
    dest,
    options,
  };

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

  await copy(path.join(sourceDir, `template/${template}`), dest, {
    rename: defaultRename,
  });

  if (isNext) {
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
  }

  const packageJson = await createPackageJson(projectName, dest, options);
  await fs.writeFile(
    path.join(dest, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  const readMe = await getReadme(dest, projectName);
  await fs.writeFile(path.join(dest, 'README.md'), readMe);

  for (const plugin of plugins) {
    await plugin.afterWrite?.(pluginContext);
  }

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
  const isNext = template.startsWith('+next');
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

  if (isNext) {
    packageJson = {
      ...packageJson,
      scripts: {
        ...packageJson.scripts,
        postinstall: 'fumadocs-mdx',
      },
    };
  }

  if (isNext && lint === 'biome') {
    packageJson = {
      ...packageJson,
      scripts: {
        ...packageJson.scripts,
        lint: 'biome check',
        format: 'biome format --write',
      },
      devDependencies: {
        ...packageJson.devDependencies,
        ...pick(versionPkg.dependencies, ['@biomejs/biome']),
      },
    };
  }

  if (isNext && lint === 'eslint') {
    packageJson = {
      ...packageJson,
      scripts: {
        ...packageJson.scripts,
        lint: 'eslint',
      },
      devDependencies: {
        ...packageJson.devDependencies,
        eslint: '^9',
        'eslint-config-next': versionPkg.dependencies.next,
        '@eslint/eslintrc': '^3',
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
