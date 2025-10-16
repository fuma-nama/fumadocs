import { getConfigHash, loadConfig } from '@/loaders/config/load';
import path from 'node:path';
import fs from 'node:fs/promises';
import { generateJS } from '@/next/map/generate';
import { findConfigFile } from '@/loaders/config';

export * from './create';

export async function postInstall(
  configPath = findConfigFile(),
  outDir = '.source',
) {
  const config = await loadConfig(configPath, outDir, undefined, true);
  const outPath = path.join(outDir, 'index.ts');

  // clean past results
  await fs.rm(outDir, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });

  const hash = await getConfigHash(configPath);
  await fs.writeFile(
    outPath,
    await generateJS(configPath, config, { relativeTo: outDir }, hash),
  );
  console.log('[MDX] types generated');
}
