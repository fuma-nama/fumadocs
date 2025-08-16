import fs from 'node:fs/promises';
import { isSrc } from '@/utils/is-src';
import { z } from 'zod';

function createConfigSchema(isSrc: boolean) {
  const defaultAliases = {
    uiDir: './components/ui',
    componentsDir: './components',
    blockDir: './components',
    cssDir: './styles',
    libDir: './lib',
  };

  return z.object({
    aliases: z
      .object({
        uiDir: z.string().default(defaultAliases.uiDir),
        componentsDir: z.string().default(defaultAliases.uiDir),
        blockDir: z.string().default(defaultAliases.blockDir),
        cssDir: z.string().default(defaultAliases.componentsDir),
        libDir: z.string().default(defaultAliases.libDir),
      })
      .default(defaultAliases),

    baseDir: z.string().default(isSrc ? 'src' : ''),

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

type ConfigSchema = ReturnType<typeof createConfigSchema>;

export type Config = z.input<ConfigSchema>;

export type LoadedConfig = z.output<ConfigSchema>;

export async function createOrLoadConfig(
  file = './cli.json',
): Promise<LoadedConfig> {
  const inited = await initConfig(file);
  if (inited) return inited;

  const content = (await fs.readFile(file)).toString();
  const src = await isSrc();
  const configSchema = createConfigSchema(src);

  return configSchema.parse(JSON.parse(content));
}

/**
 * Write new config, skip if a config already exists
 *
 * @returns the created config, `undefined` if not created
 */
export async function initConfig(
  file = './cli.json',
): Promise<LoadedConfig | undefined> {
  if (
    await fs
      .stat(file)
      .then(() => true)
      .catch(() => false)
  ) {
    return;
  }

  const src = await isSrc();
  const defaultConfig = createConfigSchema(src).parse({} satisfies Config);

  await fs.writeFile(file, JSON.stringify(defaultConfig, null, 2));
  return defaultConfig;
}
