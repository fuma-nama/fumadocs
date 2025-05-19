import fs from 'node:fs/promises';
import { isSrc } from '@/utils/is-src';

export interface Config {
  aliases?: {
    /**
     * Path for importing `cn` utility.
     *
     * Can be from Shadcn UI or your own `cn` function (Tailwind CSS supported)
     */
    cn?: string;
    uiDir?: string;
    componentsDir?: string;
    libDir?: string;
  };

  commands?: {
    /**
     * command to format output code automatically
     */
    format?: string;
  };
}

const src = await isSrc();

export const defaultConfig = {
  aliases: {
    cn: src ? './src/lib/utils.ts' : './lib/utils.ts',
    componentsDir: src ? './src/components' : './components',
    uiDir: src ? './src/components/ui' : './components/ui',
    libDir: src ? './src/lib' : './lib',
  },
} satisfies Config;

export async function loadConfig(file = './cli.json'): Promise<Config> {
  try {
    const content = await fs.readFile(file);

    return JSON.parse(content.toString()) as Config;
  } catch {
    return {};
  }
}

/**
 * Write new config, skip if a config already exists
 *
 * @returns true if the config is created, otherwise false
 */
export async function initConfig(file = './cli.json'): Promise<boolean> {
  if (
    await fs
      .stat(file)
      .then(() => true)
      .catch(() => false)
  ) {
    return false;
  }

  await fs.writeFile(file, JSON.stringify(defaultConfig, null, 2));
  return true;
}
