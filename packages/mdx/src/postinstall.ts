import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { findConfigFile, getConfigHash, loadConfig } from '@/utils/config';
import { generateJS } from '@/map/generate';
import { existsSync } from 'node:fs';
import { entry } from '@/vite/generate';

export async function postInstall(
  configPath = findConfigFile(),
  outDir?: string,
): Promise<void> {
  const isNext =
    existsSync('next.config.js') ||
    existsSync('next.config.mjs') ||
    existsSync('next.config.ts');

  if (isNext) {
    await onNext(configPath, outDir ?? '.source');
  } else {
    await onVite(configPath, outDir ?? process.cwd());
  }

  console.log('[MDX] types generated');
}

async function onNext(configPath: string, outDir: string) {
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
}

async function onVite(
  configPath: string,
  outDir: string,
  addJsExtension?: boolean,
) {
  const config = await loadConfig(configPath, 'node_modules', undefined, true);
  const outFile = 'source.generated.ts';

  await fs.writeFile(
    path.join(outDir, outFile),
    entry(configPath, config, outDir, addJsExtension),
  );
}
