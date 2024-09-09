import { detect } from 'package-manager-detector';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export async function getPackageManager(): Promise<PackageManager> {
  const result = await detect();

  return result?.name ?? 'npm';
}
