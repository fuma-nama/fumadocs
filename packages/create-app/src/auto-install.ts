import { x } from 'tinyexec';

export type PackageManager = (typeof managers)[number];

export const managers = ['npm', 'yarn', 'bun', 'pnpm'] as const;

export function getPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent ?? '';

  if (userAgent.startsWith('yarn')) {
    return 'yarn';
  }

  if (userAgent.startsWith('pnpm')) {
    return 'pnpm';
  }

  if (userAgent.startsWith('bun')) {
    return 'bun';
  }

  return 'npm';
}

export async function autoInstall(manager: PackageManager, dest: string) {
  await x(manager, ['install'], {
    throwOnError: true,
    nodeOptions: {
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1',
      },
      cwd: dest,
    },
  });
}
