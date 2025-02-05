import * as path from 'node:path';
import * as fs from 'node:fs';
import { findConfigFile, loadConfig } from '@/utils/load-config';
import { generateJS } from '@/map/generate';
import { getConfigHash } from '@/utils/config-cache';
import { readFrontmatter } from '@/utils/read-frontmatter';

export async function postInstall(
  configPath = findConfigFile(),
): Promise<void> {
  const jsOut = path.resolve('.source/index.ts');
  const config = await loadConfig(configPath);
  const hash = await getConfigHash(configPath);

  fs.mkdirSync(path.dirname(jsOut), { recursive: true });
  fs.writeFileSync(
    jsOut,
    await generateJS(
      configPath,
      config,
      path.resolve('.source/index.ts'),
      hash,
      readFrontmatter,
    ),
  );
  console.log('[MDX] types generated');
}
