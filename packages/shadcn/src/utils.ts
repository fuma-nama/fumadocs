import path from 'node:path';
import { ShadcnRegistryOptions } from '.';

export function getRegistryItemPath(registryOptions: ShadcnRegistryOptions, name: string): string {
  return path.join(path.dirname(registryOptions.registryPath), name + '.json');
}

export type PM = 'npm' | 'pnpm' | 'yarn' | 'bun';

export function formatAddCommand(components: string[]): Record<PM, string> {
  const list = components.join(' ');

  return {
    npm: `npx shadcn@latest add ${list}`,
    pnpm: `pnpm dlx shadcn@latest add ${list}`,
    yarn: `yarn dlx shadcn@latest add ${list}`,
    bun: `bunx shadcn@latest add ${list}`,
  };
}

export function formatInstallCommand(packages: string[], dev = false): Record<PM, string> {
  const pkgList = packages.join(' ');

  return {
    npm: dev ? `npm install -D ${pkgList}` : `npm install ${pkgList}`,
    pnpm: dev ? `pnpm add -D ${pkgList}` : `pnpm add ${pkgList}`,
    yarn: dev ? `yarn add -D ${pkgList}` : `yarn add ${pkgList}`,
    bun: dev ? `bun add -d ${pkgList}` : `bun add ${pkgList}`,
  };
}

export function resolveRegistryDependency(dep: string) {
  return {
    local: !dep.startsWith('http://') && !dep.startsWith('https://'),
  };
}
