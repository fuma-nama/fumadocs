import path from 'node:path';
import fs from 'node:fs/promises';
import { tryGitInit } from '@/git';
import { versions as localVersions } from '@/versions';
import versionPkg from '../../create-app-versions/package.json';
import type { PackageManager } from './auto-install';
import { autoInstall } from './auto-install';
import { sourceDir, cwd } from './constants';

export type Template =
  | '+next+content-collections'
  | '+next+fuma-docs-mdx'
  | 'react-router'
  | 'tanstack-start';

export interface Options {
  outputDir: string;
  template: Template;
  tailwindcss: boolean;
  packageManager: PackageManager;

  useSrcDir?: boolean;
  installDeps?: boolean;
  initializeGit?: boolean;
  eslint?: boolean;
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

  function defaultRename(file: string): string {
    file = file.replace('example.gitignore', '.gitignore');

    if (!options.useSrcDir || !isNext) {
      return file;
    }

    for (const dir of ['app', 'lib']) {
      const relative = path.relative(path.join(dest, dir), file);

      if (!relative.startsWith(`..${path.sep}`)) {
        return path.join(dest, 'src', dir, relative);
      }
    }
    return file;
  }

  if (isNext) {
    await copy(path.join(sourceDir, `template/+next`), dest, defaultRename);
  }

  await copy(
    path.join(sourceDir, `template/${options.template}`),
    dest,
    defaultRename,
  );

  if (isNext && options.tailwindcss) {
    await copy(
      path.join(sourceDir, `template/+next+tailwindcss`),
      dest,
      defaultRename,
    );

    if (options.useSrcDir) {
      const cssPath = path.join(dest, 'src/app/global.css');

      await fs.writeFile(
        cssPath,
        (await fs.readFile(cssPath)).toString().replace('../', '../../'),
      );
    }
    log('Configured Tailwind CSS');
  }

  if (isNext && options.eslint) {
    await copy(
      path.join(sourceDir, `template/+next+eslint`),
      dest,
      defaultRename,
    );
    log('Configured ESLint');
  }

  // update tsconfig.json for src dir
  if (isNext && options.useSrcDir) {
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

  const packageJson = createPackageJson(projectName, options);
  await fs.writeFile(
    path.join(dest, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

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
        copy(path.join(from, file), rename(path.join(to, file))),
      ),
    );
  } else {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }
}

function createPackageJson(projectName: string, options: Options): object {
  if (options.template === 'react-router') {
    return {
      name: projectName,
      private: true,
      type: 'module',
      scripts: {
        build: 'react-router build',
        dev: 'react-router dev',
        start: 'react-router-serve ./build/server/index.js',
        typecheck: 'react-router typegen && tsc',
      },
      dependencies: {
        ...pick(localVersions, [
          '@fumadocs/mdx-remote',
          'fumadocs-core',
          'fumadocs-ui',
        ]),
        ...pick(versionPkg.dependencies, [
          '@react-router/node',
          '@react-router/serve',
          'gray-matter',
          'isbot',
          'react',
          'react-dom',
          'react-router',
          'shiki',
        ]),
      },
      devDependencies: pick(versionPkg.dependencies, [
        '@react-router/dev',
        '@tailwindcss/vite',
        '@types/node',
        '@types/react',
        '@types/react-dom',
        'react-router-devtools',
        'tailwindcss',
        'typescript',
        'vite',
        'vite-tsconfig-paths',
      ]),
    };
  }

  if (options.template === 'tanstack-start') {
    return {
      name: projectName,
      type: 'module',
      scripts: {
        dev: 'vinxi dev',
        build: 'NODE_ENV=production vinxi build',
        start: 'vinxi start',
      },
      private: true,
      dependencies: {
        ...pick(localVersions, [
          '@fumadocs/mdx-remote',
          'fumadocs-ui',
          'fumadocs-core',
        ]),
        ...pick(versionPkg.dependencies, [
          '@tanstack/react-router',
          '@tanstack/react-start',
          'fast-glob',
          'gray-matter',
          'react',
          'react-dom',
          'vinxi',
        ]),
      },
      devDependencies: pick(versionPkg.dependencies, [
        '@tailwindcss/vite',
        '@types/react',
        '@types/react-dom',
        '@vitejs/plugin-react',
        'tailwindcss',
        'typescript',
        'vite',
        'vite-tsconfig-paths',
      ]),
    };
  }

  return {
    name: projectName,
    version: '0.0.0',
    private: true,
    scripts: {
      build: 'next build',
      dev: 'next dev',
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
