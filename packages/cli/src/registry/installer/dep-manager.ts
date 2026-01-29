import { exists } from '@/utils/fs';
import fs from 'node:fs/promises';
import { getPackageManager, PackageManager } from '@/utils/get-package-manager';
import { x } from 'tinyexec';

export class DependencyManager {
  private installedDeps = new Map<string, string>();
  dependencies: string[] = [];
  devDependencies: string[] = [];
  packageManager: PackageManager = 'npm';

  async init(deps: Record<string, string | null>, devDeps: Record<string, string | null>) {
    this.installedDeps.clear();
    if (await exists('package.json')) {
      const content = await fs.readFile('package.json');
      const parsed = JSON.parse(content.toString()) as object;

      if ('dependencies' in parsed && typeof parsed.dependencies === 'object') {
        const records = parsed.dependencies as Record<string, string>;

        for (const [k, v] of Object.entries(records)) {
          this.installedDeps.set(k, v);
        }
      }

      if ('devDependencies' in parsed && typeof parsed.devDependencies === 'object') {
        const records = parsed.devDependencies as Record<string, string>;

        for (const [k, v] of Object.entries(records)) {
          this.installedDeps.set(k, v);
        }
      }
    }

    this.dependencies = this.resolveRequiredDependencies(deps);
    this.devDependencies = this.resolveRequiredDependencies(devDeps);
    this.packageManager = await getPackageManager();
  }

  private resolveRequiredDependencies(deps: Record<string, string | null>): string[] {
    return Object.entries(deps)
      .filter(([k]) => !this.installedDeps.has(k))
      .map(([k, v]) => (v === null || v.length === 0 ? k : `${k}@${v}`));
  }

  hasRequired() {
    return this.dependencies.length > 0 || this.devDependencies.length > 0;
  }

  async installRequired() {
    if (this.dependencies.length > 0)
      await x(this.packageManager, ['install', ...this.dependencies]);
    if (this.devDependencies.length > 0)
      await x(this.packageManager, ['install', ...this.devDependencies, '-D']);
  }
}
