import fs from 'node:fs/promises';
import { getPackageManager, PackageManager } from '@/utils/get-package-manager';
import { x } from 'tinyexec';
import path from 'node:path';

interface PackageJsonType {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class DependencyManager {
  private installedDeps = new Map<string, string>();
  dependencies: string[] = [];
  devDependencies: string[] = [];
  packageManager: PackageManager = 'npm';

  constructor(private readonly cwd: string) {}

  async init(deps: Record<string, string | null>, devDeps: Record<string, string | null>) {
    this.installedDeps.clear();
    const packageJsonPath = path.join(this.cwd, 'package.json');
    const content = await fs
      .readFile(packageJsonPath)
      .then((res) => res.toString())
      .catch(() => null);

    if (content !== null) {
      const parsed = JSON.parse(content) as PackageJsonType;

      for (const [k, v] of Object.entries(parsed?.dependencies ?? {})) {
        this.installedDeps.set(k, v);
      }

      for (const [k, v] of Object.entries(parsed?.devDependencies ?? {})) {
        this.installedDeps.set(k, v);
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

  async writeRequired() {
    const packageJsonPath = path.join(this.cwd, 'package.json');
    const content = await fs.readFile(packageJsonPath).catch(() => null);
    if (content === null) return false;

    const parsed = JSON.parse(content.toString()) as PackageJsonType;
    if (!parsed) return false;

    for (const dep of this.dependencies) {
      const { name, version } = parseDep(dep);
      parsed.dependencies ??= {};
      parsed.dependencies[name] ??= version;
    }

    for (const dep of this.devDependencies) {
      const { name, version } = parseDep(dep);
      parsed.devDependencies ??= {};
      parsed.devDependencies[name] ??= version;
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(parsed, null, 2));
  }

  async installRequired() {
    if (this.dependencies.length > 0)
      await x(this.packageManager, ['install', ...this.dependencies]);
    if (this.devDependencies.length > 0)
      await x(this.packageManager, ['install', ...this.devDependencies, '-D']);
  }
}

function parseDep(dep: string) {
  const idx = dep.indexOf('@', 1);
  if (idx === -1) {
    return { name: dep, version: 'latest' };
  } else {
    return { name: dep.slice(0, idx), version: dep.slice(idx + 1) };
  }
}
