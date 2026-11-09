import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { detectFramework } from 'fuma-cli/detect';

const frameworks = ['next', 'astro', 'waku', 'react-router', 'tanstack-start'] as const;
export type Framework = (typeof frameworks)[number];

function isSupportedFramework(v: string): v is Framework {
  return frameworks.includes(v as Framework);
}

/** a site of Fumapress: it sets up docs and their features with plugins, only the UI of Fumadocs is for it */
export async function isFumapress(cwd = process.cwd()): Promise<boolean> {
  const files = await fs.readdir(cwd).catch(() => []);
  return files.some((file) => file.startsWith('press.config.'));
}

/** `fuma-cli` doesn't detect Astro, or Waku brought by Fumapress */
async function detect(cwd: string): Promise<Framework> {
  const files = await fs.readdir(cwd).catch(() => []);
  if (files.some((file) => file.startsWith('astro.config.'))) return 'astro';
  if (await isFumapress(cwd)) return 'waku';
  const framework = await detectFramework(cwd);
  return isSupportedFramework(framework) ? framework : 'next';
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

const uiLibraries = ['radix-ui', 'base-ui'] as const;

export interface LoadedConfig {
  $schema?: string;
  aliases: {
    uiDir: string;
    componentsDir: string;
    layoutDir: string;
    cssDir: string;
    libDir: string;
    /** module exporting `cn`, installed components import it instead of `lib/cn.ts` */
    utils?: string;
  };
  baseDir: string;
  uiLibrary: (typeof uiLibraries)[number];
  framework: Framework;
  commands: {
    /** command to format output code automatically */
    format?: string;
  };
}

/** content of `cli.json` */
export interface ConfigInput extends Partial<Omit<LoadedConfig, 'aliases'>> {
  aliases?: Partial<LoadedConfig['aliases']>;
}

export async function createConfigSchema(cwd = process.cwd()) {
  const shadcn = await readShadcnAliases(cwd);
  const framework = await detect(cwd);

  return {
    /** fill the defaults of `cli.json` */
    parse(input: ConfigInput): LoadedConfig {
      const { uiLibrary = 'base-ui' } = input;
      if (!uiLibraries.includes(uiLibrary)) throw new Error(`unknown uiLibrary "${uiLibrary}"`);
      if (input.framework && !isSupportedFramework(input.framework))
        throw new Error(`unknown framework "${input.framework}"`);

      return {
        $schema: input.$schema ?? 'node_modules/@fumadocs/cli/dist/schema.json',
        aliases: {
          uiDir: shadcn.ui ?? './components/ui',
          componentsDir: shadcn.components ?? './components',
          layoutDir: './layouts',
          cssDir: './styles',
          libDir: shadcn.lib ?? './lib',
          utils: shadcn.utils,
          ...input.aliases,
        },
        baseDir: input.baseDir ?? defaultBaseDir(cwd, framework),
        uiLibrary,
        framework: input.framework ?? framework,
        commands: input.commands ?? {},
      };
    },
  };
}

function defaultBaseDir(cwd: string, framework: Framework): string {
  if (framework === 'react-router') return 'app';
  // the routes directory of the framework decides whether app code lives in `src`
  const routes = { next: 'app', waku: 'pages', 'tanstack-start': 'routes', astro: 'pages' }[
    framework
  ];
  if (existsSync(path.resolve(cwd, 'src', routes))) return 'src';
  if (existsSync(path.resolve(cwd, routes))) return '';
  return existsSync(path.resolve(cwd, 'src')) ? 'src' : '';
}

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
