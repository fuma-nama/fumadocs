import path from 'node:path';
import fs from 'node:fs';
import { findConfigFile, loadConfig } from '@/config/load';
import { generateTypes } from '@/map/generate';

export async function postInstall(
  configPath = findConfigFile(),
): Promise<void> {
  const typeOut = path.resolve('.source/index.d.ts');
  const config = await loadConfig(configPath);

  fs.mkdirSync(path.dirname(typeOut), { recursive: true });
  fs.writeFileSync(typeOut, generateTypes(configPath, config, typeOut));
  console.log('[MDX] types generated');
}
