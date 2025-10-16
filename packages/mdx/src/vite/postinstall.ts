import { loadConfig } from '@/loaders/config/load';
import fs from 'node:fs/promises';
import path from 'node:path';
import { entry, type IndexFileOptions } from '@/vite/generate';
import { findConfigFile } from '@/loaders/config';

export async function postInstall(
  configPath = findConfigFile(),
  options: IndexFileOptions = {},
) {
  const { out = 'source.generated.ts' } = options;
  const config = await loadConfig(configPath, 'node_modules', undefined, true);

  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, entry(configPath, config, options));
  console.log('[MDX] types generated');
}
