import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { findConfigFile, getConfigHash, loadConfig } from '@/utils/config';
import { generateJS } from '@/map/generate';

export async function postInstall(
  configPath = findConfigFile(),
): Promise<void> {
  const jsOut = path.resolve('.source/index.ts');
  const hash = await getConfigHash(configPath);
  const config = await loadConfig(configPath, hash, true);

  // clean past results
  await fs.rm(path.dirname(jsOut), { recursive: true });

  await fs.mkdir(path.dirname(jsOut), { recursive: true });
  await fs.writeFile(jsOut, await generateJS(configPath, config, jsOut, hash));
  console.log('[MDX] types generated');
}
