import fs from 'node:fs/promises';
import { x } from 'tinyexec';
import path from 'node:path';
import { detect, type AgentName } from 'package-manager-detector';

interface PackageJsonType {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function createDeps(
  cwd: string,
  dependencies: Record<string, string | null>,
  devDependencies: Record<string, string | null>,
) {
  const packageJsonPath = path.join(cwd, 'package.json');
  const packageJson = await fs
    .readFile(packageJsonPath)
    .then((res) => JSON.parse(res.toString()) as PackageJsonType)
    .catch(() => null);

  return new DependencyManager(cwd, packageJson, dependencies, devDependencies);
}

export class DependencyManager {
  readonly dependencies: string[];
  readonly devDependencies: string[];

  constructor(
    private readonly cwd: string,
    private readonly packageJson: PackageJsonType | null,
    dependencies: Record<string, string | null>,
    devDependencies: Record<string, string | null>,
  ) {
    const installedDeps = {
      ...packageJson?.dependencies,
      ...packageJson?.devDependencies,
    };

    this.dependencies = Object.entries(dependencies)
      .filter(([k]) => !(k in installedDeps))
      .map(([k, v]) => encodeDep(k, v));

    this.devDependencies = Object.entries(devDependencies)
      .filter(([k]) => !(k in installedDeps))
      .map(([k, v]) => encodeDep(k, v));
  }

  hasRequired() {
    return this.dependencies.length > 0 || this.devDependencies.length > 0;
  }

  async writeRequired(packageJsonPath = path.resolve(this.cwd, 'package.json')) {
    if (this.packageJson === null) return false;

    for (const dep of this.dependencies) {
      const { name, version } = decodeDep(dep);
      this.packageJson.dependencies ??= {};
      this.packageJson.dependencies[name] ??= version;
    }

    for (const dep of this.devDependencies) {
      const { name, version } = decodeDep(dep);
      this.packageJson.devDependencies ??= {};
      this.packageJson.devDependencies[name] ??= version;
    }

    await fs.writeFile(packageJsonPath, JSON.stringify(this.packageJson, null, 2));
  }

  async installRequired(packageManager?: AgentName) {
    packageManager ??= (await detect())?.name ?? 'npm';

    if (this.dependencies.length > 0) await x(packageManager, ['install', ...this.dependencies]);
    if (this.devDependencies.length > 0)
      await x(packageManager, ['install', ...this.devDependencies, '-D']);
  }
}

function encodeDep(name: string, version: string | null): string {
  return version === null || version.length === 0 ? name : `${name}@${version}`;
}

function decodeDep(dep: string) {
  const idx = dep.indexOf('@', 1);
  if (idx === -1) {
    return { name: dep, version: 'latest' };
  } else {
    return { name: dep.slice(0, idx), version: dep.slice(idx + 1) };
  }
}
