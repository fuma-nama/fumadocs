import fs from 'node:fs/promises';
import path from 'node:path';
import { detectFramework, detectPackageManager } from 'fuma-cli/detect';
import type { LoadedConfig } from '@/config';
import { exists } from '@/utils/fs';

export type PackageManager = NonNullable<Awaited<ReturnType<typeof detectPackageManager>>>['name'];

export type Framework = 'next' | 'react-router' | 'tanstack-start' | 'waku' | 'astro';
/** frameworks supported by features that generate routes */
export type ReactFramework = Exclude<Framework, 'astro'>;

export interface FrameworkInfo {
  /** import specifier of `RootProvider` */
  provider: string;
  /** root file that imports the global CSS, relative to base dir */
  rootFile: string;
  /** routes directory, relative to base dir */
  routesDir: string;
  /** config file candidates (relative to cwd) that register bundler plugins */
  configFiles: string[];
  /** how to detect `static` mode from the config file */
  isStatic?: (config: string) => boolean;
}

export const frameworks: Record<Framework, FrameworkInfo> = {
  next: {
    provider: 'fumadocs-ui/provider/next',
    rootFile: 'app/layout.tsx',
    routesDir: 'app',
    configFiles: ['next.config.mjs', 'next.config.ts', 'next.config.js'],
    isStatic: (config) => /output:\s*['"]export['"]/.test(config),
  },
  'react-router': {
    provider: 'fumadocs-ui/provider/react-router',
    rootFile: 'root.tsx',
    routesDir: 'routes',
    configFiles: ['vite.config.ts'],
  },
  'tanstack-start': {
    provider: 'fumadocs-ui/provider/tanstack',
    rootFile: 'routes/__root.tsx',
    routesDir: 'routes',
    configFiles: ['vite.config.ts'],
    isStatic: (config) => /\bspa:\s*\{/.test(config),
  },
  waku: {
    provider: 'fumadocs-ui/provider/waku',
    rootFile: 'pages/_root.tsx',
    routesDir: 'pages',
    configFiles: ['waku.config.ts'],
  },
  astro: {
    provider: 'fumadocs-ui/provider/astro',
    rootFile: 'layouts/Layout.astro',
    routesDir: 'pages',
    configFiles: ['astro.config.mjs', 'astro.config.ts'],
  },
};

export interface Project {
  cwd: string;
  framework: Framework;
  info: FrameworkInfo;
  /** prerendered to static HTML, no server at runtime */
  static: boolean;
  packageManager: PackageManager;
  /** directory of app code, relative to `cwd` */
  baseDir: string;
  config: LoadedConfig;
  /** config file that registers bundler plugins, relative to `cwd` */
  configFile?: string;
  packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

export function isSupportedFramework(v: string): v is Framework {
  return v in frameworks;
}

export async function loadProject(
  config: LoadedConfig,
  cwd = process.cwd(),
  framework: Framework = assertFramework(config.framework),
): Promise<Project> {
  const info = frameworks[framework];
  const [packageJson, pm] = await Promise.all([
    fs.readFile(path.join(cwd, 'package.json'), 'utf-8').then(JSON.parse, () => ({})),
    detectPackageManager({ cwd }),
  ]);
  let configFile: string | undefined;
  let configContent: string | undefined;
  for (const file of info.configFiles) {
    if (await exists(path.join(cwd, file))) {
      configFile = file;
      configContent = await fs.readFile(path.join(cwd, file), 'utf-8');
      break;
    }
  }

  let isStatic = false;
  if (framework === 'react-router') {
    const content = await fs
      .readFile(path.join(cwd, 'react-router.config.ts'), 'utf-8')
      .catch(() => '');
    isStatic = /ssr:\s*false/.test(content);
  } else if (configContent && info.isStatic) {
    isStatic = info.isStatic(configContent);
  }

  return {
    cwd,
    framework,
    info,
    static: isStatic,
    packageManager: pm?.name ?? 'npm',
    baseDir: config.baseDir,
    config,
    configFile,
    packageJson,
  };
}

function assertFramework(framework: string): Framework {
  if (isSupportedFramework(framework)) return framework;
  throw new Error(
    `Unsupported framework "${framework}", supported: ${Object.keys(frameworks).join(', ')}.`,
  );
}

export { detectFramework };
