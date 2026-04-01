import fs from 'node:fs/promises';
import { z } from 'zod';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const frameworks = ['next', 'waku', 'react-router', 'tanstack-start'] as const;
export type Framework = (typeof frameworks)[number];

export function createConfigSchema(cwd = process.cwd()) {
  const srcDir = path.resolve(cwd, 'src');
  const packageJsonPath = path.resolve(cwd, 'package.json');
  const defaultAliases = {
    uiDir: './components/ui',
    componentsDir: './components',
    layoutDir: './layouts',
    cssDir: './styles',
    libDir: './lib',
  };

  return z.object({
    $schema: z.string().default('node_modules/@fumadocs/cli/dist/schema.json').optional(),
    aliases: z
      .object({
        uiDir: z.string().default(defaultAliases.uiDir),
        componentsDir: z.string().default(defaultAliases.uiDir),
        layoutDir: z.string().default(defaultAliases.layoutDir),
        cssDir: z.string().default(defaultAliases.componentsDir),
        libDir: z.string().default(defaultAliases.libDir),
      })
      .default(defaultAliases),

    baseDir: z.string().default(() => (existsSync(srcDir) ? 'src' : '')),
    uiLibrary: z.enum(['radix-ui', 'base-ui']).default('radix-ui'),
    framework: z.literal(frameworks).default(() => {
      return detectFrameworkFromPackageJson(packageJsonPath) ?? 'next';
    }),

    commands: z
      .object({
        /**
         * command to format output code automatically
         */
        format: z.string().optional(),
      })
      .default({}),
  });
}

function detectFrameworkFromPackageJson(pkgPath: string): Framework | undefined {
  try {
    const pkgRaw = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgRaw);

    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (deps['next']) return 'next';
    if (deps['waku']) return 'waku';
    if (deps['react-router'] || deps['react-router-dom']) return 'react-router';
    if (deps['@tanstack/react-start']) return 'tanstack-start';
  } catch {
    return;
  }
}

type ConfigSchema = ReturnType<typeof createConfigSchema>;

export type ConfigInput = z.input<ConfigSchema>;
export type LoadedConfig = z.output<ConfigSchema>;

export async function createOrLoadConfig(file = './cli.json'): Promise<LoadedConfig> {
  const inited = await initConfig(file);
  if (inited) return inited;

  const content = (await fs.readFile(file)).toString();
  const configSchema = createConfigSchema();

  return configSchema.parse(JSON.parse(content));
}

/**
 * Write new config, skip if a config already exists
 *
 * @returns the created config, `undefined` if not created
 */
export async function initConfig(file = './cli.json'): Promise<LoadedConfig | undefined> {
  if (
    await fs
      .stat(file)
      .then(() => true)
      .catch(() => false)
  ) {
    return;
  }

  const defaultConfig = await getDefaultConfig();
  await fs.writeFile(file, JSON.stringify(defaultConfig, null, 2));
  return defaultConfig;
}

export async function getDefaultConfig(cwd?: string) {
  return createConfigSchema(cwd).parse({} satisfies ConfigInput);
}
