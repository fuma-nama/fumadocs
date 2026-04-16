import fs from 'node:fs/promises';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { detectFramework } from 'fuma-cli/detect';

const frameworks = ['next', 'waku', 'react-router', 'tanstack-start'] as const;
export type Framework = (typeof frameworks)[number];

function isSupportedFramework(v: string): v is Framework {
  return frameworks.includes(v as Framework);
}

export async function createConfigSchema(cwd = process.cwd()) {
  const defaultAliases = {
    uiDir: './components/ui',
    componentsDir: './components',
    layoutDir: './layouts',
    cssDir: './styles',
    libDir: './lib',
  };

  let framework = await detectFramework(cwd);
  if (!isSupportedFramework(framework)) framework = 'next';

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

    baseDir: z.string().default(() => {
      if (framework === 'react-router' && existsSync(path.resolve(cwd, 'app'))) return 'app';
      if (existsSync(path.resolve(cwd, 'src'))) return 'src';
      return '';
    }),
    uiLibrary: z.enum(['radix-ui', 'base-ui']).default('radix-ui'),
    framework: z.literal(frameworks).default(framework),

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

type ConfigSchema = Awaited<ReturnType<typeof createConfigSchema>>;

export type ConfigInput = z.input<ConfigSchema>;
export type LoadedConfig = z.output<ConfigSchema>;

export async function createOrLoadConfig(file = './cli.json'): Promise<LoadedConfig> {
  const inited = await initConfig(file);
  if (inited) return inited;

  const content = await fs.readFile(file, 'utf-8');
  const configSchema = await createConfigSchema();

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
  const schema = await createConfigSchema(cwd);
  return schema.parse({} satisfies ConfigInput);
}
