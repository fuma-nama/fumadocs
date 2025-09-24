import { loadConfig } from '@/loaders/config/load';
import fs from 'node:fs/promises';
import path from 'node:path';
import { entry } from '@/vite/generate';
import { findConfigFile } from '@/loaders/config';

export async function postInstall(
  configPath = findConfigFile(),
  outDir?: string,
  addJsExtension = false,
) {
  const config = await loadConfig(configPath, 'node_modules', undefined, true);
  const outFile = 'source.generated.ts';

  if (outDir) {
    await fs.mkdir(outDir, { recursive: true });
  }

  await fs.writeFile(
    outDir ? path.join(outDir, outFile) : outFile,
    entry(configPath, config, outDir ?? process.cwd(), addJsExtension),
  );
  console.log('[MDX] types generated');
}
