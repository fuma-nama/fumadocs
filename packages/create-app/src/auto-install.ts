import { spawn } from 'cross-spawn';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

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

export function autoInstall(
  manager: PackageManager,
  dest: string,
): Promise<void> {
  return new Promise((res, reject) => {
    const installProcess = spawn(manager, ['install'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1',
      },
      cwd: dest,
    });

    installProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Install failed'));
      } else {
        res();
      }
    });
  });
}
