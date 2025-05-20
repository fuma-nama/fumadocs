import { getPackageManager } from '@/utils/get-package-manager';
import { confirm, isCancel, spinner } from '@clack/prompts';
import { x } from 'tinyexec';
import type { OutputComponent } from '@/build';
import { getDeps } from '@/utils/add/get-deps';

export async function installDeps(results: OutputComponent[]) {
  const installed = await getDeps();
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};

  for (const result of results) {
    Object.assign(deps, result.dependencies);
    Object.assign(devDeps, result.devDependencies);
  }

  const items = Object.entries(deps)
    .filter(([k]) => !installed.has(k))
    .map(([k, v]) => (v.length === 0 ? k : `${k}@${v}`));

  const devItems = Object.entries(devDeps)
    .filter(([k]) => !installed.has(k))
    .map(([k, v]) => (v.length === 0 ? k : `${k}@${v}`));

  if (items.length > 0 || devItems.length > 0) {
    const manager = await getPackageManager();
    const value = await confirm({
      message: `Do you want to install with ${manager}?
${[...items, ...devItems].map((v) => `- ${v}`).join('\n')}`,
    });

    if (isCancel(value)) {
      return;
    }

    if (value) {
      const spin = spinner();
      spin.start('Installing dependencies...');
      if (items.length > 0) await x(manager, ['install', ...items]);
      if (devItems.length > 0) await x(manager, ['install', ...devItems, '-D']);

      spin.stop('Dependencies installed.');
    }
  }
}
