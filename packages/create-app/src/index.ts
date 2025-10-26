import path from 'node:path';
import fs from 'node:fs/promises';
import { copy, tryGitInit } from '@/utils';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import {
  depVersions,
  sourceDir,
  type TemplateInfo,
  templates,
} from './constants';

export type Template = TemplateInfo['value'];
export interface Options {
  outputDir: string;
  template: Template;

  /**
   * the package manager to use
   *
   * @defaultValue 'npm'
   */
  packageManager?: PackageManager;

  installDeps?: boolean;
  initializeGit?: boolean;
  log?: (message: string) => void;
  plugins?: TemplatePlugin[];
}

export interface TemplatePluginContext {
  template: TemplateInfo;
  log: (message: string) => void;
  /**
   * output directory
   */
  dest: string;

  /**
   * output directory for app code (e.g. under `/src`)
   */
  appDir: string;
}

export type PackageJsonType = {
  name?: string;
  version?: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} & Record<string, unknown>;

type Awaitable<T> = T | Promise<T>;

export interface TemplatePlugin {
  template?: (
    this: Pick<TemplatePluginContext, 'dest'>,
    info: TemplateInfo,
  ) => Awaitable<void | TemplateInfo>;
  packageJson?: (
    this: TemplatePluginContext,
    packageJson: PackageJsonType,
  ) => Awaitable<void | PackageJsonType>;
  afterWrite?: (this: TemplatePluginContext) => Awaitable<void>;
  readme?: (
    this: TemplatePluginContext,
    content: string,
  ) => Awaitable<void | string>;
}

export async function create(createOptions: Options): Promise<void> {
  const {
    outputDir,
    plugins = [],
    packageManager = 'npm',
    initializeGit = false,
    installDeps = false,
    log = console.log,
  } = createOptions;

  let template = templates.find(
    (item) => item.value === createOptions.template,
  )!;
  for (const plugin of plugins) {
    template =
      (await plugin.template?.call({ dest: outputDir }, template)) ?? template;
  }

  const appDir = path.join(outputDir, template.appDir);
  const projectName = path.basename(outputDir);
  const pluginContext: TemplatePluginContext = {
    template,
    dest: outputDir,
    log,
    appDir,
  };

  await copy(path.join(sourceDir, 'template', template.value), outputDir, {
    rename(file) {
      file = file.replace('example.gitignore', '.gitignore');

      return template.rename?.(file) ?? file;
    },
  });

  const packageJsonPath = path.join(outputDir, 'package.json');
  let packageJson = await initPackageJson(projectName, packageJsonPath);
  for (const plugin of plugins) {
    packageJson =
      (await plugin.packageJson?.call(pluginContext, packageJson)) ??
      packageJson;
  }
  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const readmePath = path.join(outputDir, 'README.md');
  let readme = `# ${projectName}\n\n${await fs.readFile(readmePath)}`;
  for (const plugin of plugins) {
    readme = (await plugin.readme?.call(pluginContext, readme)) ?? readme;
  }
  await fs.writeFile(readmePath, readme);

  for (const plugin of plugins) {
    await plugin.afterWrite?.call(pluginContext);
  }

  if (installDeps) {
    try {
      await autoInstall(packageManager, outputDir);
      log('Installed dependencies');
    } catch (err) {
      log(`Failed to install dependencies: ${err}`);
    }
  }

  if (initializeGit && (await tryGitInit(outputDir))) {
    log('Initialized Git repository');
  }
}

async function initPackageJson(
  projectName: string,
  packageJsonPath: string,
): Promise<PackageJsonType> {
  function replaceWorkspaceDeps(deps: Record<string, string> = {}) {
    for (const k in deps) {
      if (deps[k].startsWith('workspace:') && k in depVersions) {
        deps[k] = depVersions[k as keyof typeof depVersions];
      }
    }

    return deps;
  }

  const packageJson: PackageJsonType = JSON.parse(
    (await fs.readFile(packageJsonPath)).toString(),
  );

  return {
    ...packageJson,
    name: projectName,
    scripts: {
      ...packageJson.scripts,
      postinstall: 'fumadocs-mdx',
    },
    dependencies: replaceWorkspaceDeps(packageJson.dependencies),
    devDependencies: replaceWorkspaceDeps(packageJson.devDependencies),
  };
}
