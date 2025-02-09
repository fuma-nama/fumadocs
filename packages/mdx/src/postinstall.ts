import * as path from 'node:path';
import * as fs from 'node:fs';
import { findConfigFile, getConfigHash, loadConfig } from '@/utils/config';
import { generateJS } from '@/map/generate';
import { readFrontmatter } from '@/utils/read-frontmatter';

export async function postInstall(
  configPath = findConfigFile(),
): Promise<void> {
  const jsOut = path.resolve('.source/index.ts');
  const hash = await getConfigHash(configPath);
  const config = await loadConfig(configPath, hash, true);

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
