import { detect, type AgentName } from 'package-manager-detector';

export type PackageManager = AgentName;

export async function getPackageManager(): Promise<PackageManager> {
  const result = await detect();

  return result?.name ?? 'npm';
}
