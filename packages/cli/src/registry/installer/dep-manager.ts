import { exists } from '@/utils/fs';
import fs from 'node:fs/promises';
import { getPackageManager } from '@/utils/get-package-manager';
import { confirm, isCancel, spinner } from '@clack/prompts';
import { x } from 'tinyexec';

export class DependencyManager {
  private cachedInstalledDeps: Map<string, string> | undefined;

  /**
   * Get dependencies from `package.json`
   */
  async getDeps(): Promise<Map<string, string>> {
    if (this.cachedInstalledDeps) return this.cachedInstalledDeps;
    const dependencies = new Map<string, string>();

    if (!(await exists('package.json'))) return dependencies;

    const content = await fs.readFile('package.json');
    const parsed = JSON.parse(content.toString()) as object;

    if ('dependencies' in parsed && typeof parsed.dependencies === 'object') {
      const records = parsed.dependencies as Record<string, string>;

      for (const [k, v] of Object.entries(records)) {
        dependencies.set(k, v);
      }
    }

    if ('devDependencies' in parsed && typeof parsed.devDependencies === 'object') {
      const records = parsed.devDependencies as Record<string, string>;

      for (const [k, v] of Object.entries(records)) {
        dependencies.set(k, v);
      }
    }

    return (this.cachedInstalledDeps = dependencies);
  }

  private async resolveInstallDependencies(deps: Record<string, string | null>): Promise<string[]> {
    const cachedInstalledDeps = await this.getDeps();

    return Object.entries(deps)
      .filter(([k]) => !cachedInstalledDeps.has(k))
      .map(([k, v]) => (v === null || v.length === 0 ? k : `${k}@${v}`));
  }

  async installDeps(deps: Record<string, string | null>, devDeps: Record<string, string | null>) {
    const items = await this.resolveInstallDependencies(deps);
    const devItems = await this.resolveInstallDependencies(devDeps);
    if (items.length === 0 && devItems.length === 0) return;

    const manager = await getPackageManager();
    const value = await confirm({
      message: `Do you want to install with ${manager}?
${[...items, ...devItems].map((v) => `- ${v}`).join('\n')}`,
    });

    if (isCancel(value) || !value) {
      return;
    }

    const spin = spinner();
    spin.start('Installing dependencies...');
    if (items.length > 0) await x(manager, ['install', ...items]);
    if (devItems.length > 0) await x(manager, ['install', ...devItems, '-D']);
    spin.stop('Dependencies installed.');
  }
}
