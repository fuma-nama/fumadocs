import path from 'node:path';
import { x } from 'tinyexec';

const cache = new Map<string, Date>();

/**
 * Requires `git` to be installed
 *
 * if you are using Vercel, please set `VERCEL_DEEP_CLONE` environment variable to `true`
 */
export async function getGitTimestamp(file: string): Promise<Date | undefined> {
  const cached = cache.get(file);
  if (cached) return cached;

  try {
    const out = await x(
      'git',
      ['log', '-1', '--pretty="%ai"', path.relative(process.cwd(), file)],
      {
        throwOnError: true,
      },
    );

    const time = new Date(out.stdout);
    cache.set(file, time);
    return time;
  } catch {
    return;
  }
}
