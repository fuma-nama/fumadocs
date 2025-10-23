import path from 'node:path';
import fs from 'node:fs/promises';
import { copy, pick, tryGitInit } from '@/utils';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import {
  cwd,
  depVersions,
  sourceDir,
  type TemplateInfo,
  templates,
} from './constants';

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

type Awaitable<T> = T | Promise<T>;

export interface TemplatePlugin {
  packageJson?: (
    this: TemplatePluginContext,
    packageJson: any,
  ) => Awaitable<void | any>;
  afterWrite?: (this: TemplatePluginContext) => Awaitable<void>;
  readme?: (
    this: TemplatePluginContext,
    content: string,
  ) => Awaitable<void | string>;
}

function defaults(options: Options): Required<Options> {
  return {
    ...options,
    plugins: options.plugins ?? [],
    useSrcDir:
      options.template.startsWith('+next') && options.useSrcDir === true,
    lint: options.lint ?? false,
    initializeGit: options.initializeGit ?? false,
    installDeps: options.installDeps ?? false,
    log: console.log,
  };
}

function isRelative(dir: string, file: string) {
  return !path.relative(dir, file).startsWith(`..${path.sep}`);
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

  await copy(path.join(sourceDir, `template/${template}`), dest, {
    rename(file) {
      file = file.replace('example.gitignore', '.gitignore');

      if (
        useSrcDir &&
        (path.basename(file) === 'mdx-components.tsx' ||
          isRelative(path.join(dest, 'app'), file) ||
          isRelative(path.join(dest, 'lib'), file))
      ) {
        return path.join(dest, 'src', path.relative(dest, file));
      }

      return file;
    },
  });

  // optional ESLint configuration
  if (isNext && lint) {
    await copy(path.join(sourceDir, `template/+next+${lint}`), dest);
    log('Configured Linter');
  }

  // update tsconfig.json for src dir
  if (isNext && useSrcDir) {
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

  let packageJson = await createPackageJson(projectName, dest, options);
  for (const plugin of plugins) {
    const result = await plugin.packageJson?.call(pluginContext, packageJson);

    if (result) packageJson = result;
  }
  await fs.writeFile(
    path.join(dest, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  let readme = await getReadme(dest, projectName);
  for (const plugin of plugins) {
    readme = (await plugin.readme?.call(pluginContext, readme)) ?? readme;
  }
  await fs.writeFile(path.join(dest, 'README.md'), readme);

  for (const plugin of plugins) {
    await plugin.afterWrite?.call(pluginContext);
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
      if (deps[k].startsWith('workspace:') && k in depVersions) {
        deps[k] = depVersions[k as keyof typeof depVersions];
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
        ...pick(depVersions, ['@biomejs/biome']),
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
        'eslint-config-next': depVersions.next,
        '@eslint/eslintrc': '^3',
      },
    };
  }

  return packageJson;
}
