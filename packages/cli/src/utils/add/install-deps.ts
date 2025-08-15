import { getPackageManager } from '@/utils/get-package-manager';
import { confirm, isCancel, spinner } from '@clack/prompts';
import { x } from 'tinyexec';
import { getDeps } from '@/utils/add/get-deps';

export async function installDeps(
  deps: Record<string, string | null>,
  devDeps: Record<string, string | null>,
) {
  const installed = await getDeps();

  function toList(deps: Record<string, string | null>): string[] {
    return Object.entries(deps)
      .filter(([k]) => !installed.has(k))
      .map(([k, v]) => (v === null || v.length === 0 ? k : `${k}@${v}`));
  }

  const items = toList(deps);
  const devItems = toList(devDeps);

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
