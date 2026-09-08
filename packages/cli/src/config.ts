import fs from 'node:fs/promises';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { detectFramework } from 'fuma-cli/detect';

const frameworks = ['next', 'astro', 'waku', 'react-router', 'tanstack-start'] as const;
export type Framework = (typeof frameworks)[number];

function isSupportedFramework(v: string): v is Framework {
  return frameworks.includes(v as Framework);
}

/** directories from shadcn's `components.json`, so components are installed at the same place */
async function readShadcnAliases(cwd: string): Promise<Record<string, string>> {
  const content = await fs.readFile(path.join(cwd, 'components.json'), 'utf-8').catch(() => null);
  if (!content) return {};
  const out: Record<string, string> = {};
  let aliases: Record<string, unknown> = {};
  try {
    aliases = JSON.parse(content).aliases ?? {};
  } catch {
    return out;
  }
  for (const [key, alias] of Object.entries(aliases)) {
    // e.g. `@/components/ui` -> `./components/ui`
    if (typeof alias === 'string') out[key] = `.${alias.slice(alias.indexOf('/'))}`;
  }
  return out;
}

export async function createConfigSchema(cwd = process.cwd()) {
  const shadcn = await readShadcnAliases(cwd);
  const defaultAliases = {
    uiDir: shadcn.ui ?? './components/ui',
    componentsDir: shadcn.components ?? './components',
    layoutDir: './layouts',
    cssDir: './styles',
    libDir: shadcn.lib ?? './lib',
  };

  let framework = await detectFramework(cwd);
  if (!isSupportedFramework(framework)) framework = 'next';

  return z.object({
    $schema: z.string().default('node_modules/@fumadocs/cli/dist/schema.json').optional(),
    aliases: z
      .object({
        uiDir: z.string().default(defaultAliases.uiDir),
        componentsDir: z.string().default(defaultAliases.componentsDir),
        layoutDir: z.string().default(defaultAliases.layoutDir),
        cssDir: z.string().default(defaultAliases.cssDir),
        libDir: z.string().default(defaultAliases.libDir),
      })
      .default(defaultAliases),

    baseDir: z.string().default(() => {
      if (framework === 'react-router') return 'app';
      // the routes directory of the framework decides whether app code lives in `src`
      const routes = { next: 'app', waku: 'pages', 'tanstack-start': 'routes' }[framework] ?? '';
      if (existsSync(path.resolve(cwd, 'src', routes))) return 'src';
      if (routes && existsSync(path.resolve(cwd, routes))) return '';
      return existsSync(path.resolve(cwd, 'src')) ? 'src' : '';
    }),
    uiLibrary: z.enum(['radix-ui', 'base-ui']).default('base-ui'),
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
