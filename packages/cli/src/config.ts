import fs from 'node:fs/promises';
import { isSrc } from '@/utils/is-src';

export interface Config {
  aliases?: {
    /**
     * Path for importing `cn` utility.
     *
     * Can be from Shadcn UI or your own `cn` function (Tailwind CSS supported)
     *
     * Be careful to **not** include file extensions.
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
    cn: src ? './src/utils/cn' : './utils/cn',
    componentsDir: src ? './src/components' : './components',
    uiDir: src ? './src/components/ui' : './components/ui',
    libDir: src ? './src/lib' : './lib',
  },
} satisfies Config;

export async function loadConfig(file = './cli.json'): Promise<Config> {
  try {
    const content = await fs.readFile(file);

    return JSON.parse(content.toString()) as Config;
  } catch (_) {
    return {};
  }
}

export async function initConfig(file = './cli.json'): Promise<void> {
  await fs.writeFile(file, JSON.stringify(defaultConfig, null, 2));
}
