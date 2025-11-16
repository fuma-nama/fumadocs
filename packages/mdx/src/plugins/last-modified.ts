import path from 'node:path';
import { x } from 'tinyexec';
import type { Plugin } from '@/core';

const cache = new Map<string, Promise<Date>>();

export interface LastModifiedPluginOptions {
  /**
   * Version control to obtain the last modified time.
   *
   * - `git`: Requires `git` to be installed.
   *
   *    If you are using Vercel, please set `VERCEL_DEEP_CLONE` environment variable to `true`.
   *
   * @defaultValue 'git'
   */
  versionControl?: 'git';
}

/**
 * Injects `lastModified` property to page exports.
 */
export default function lastModified(
  options: LastModifiedPluginOptions = {},
): Plugin {
  const { versionControl = 'git' } = options;

  return {
    name: 'last-modified',
    doc: {
      async vfile(file) {
        if (versionControl === 'git') {
          const timestamp = await getGitTimestamp(this.filePath).then((v) =>
            v?.getTime(),
          );
          if (timestamp === undefined) return;

          file.data['mdx-export'] ??= [];
          file.data['mdx-export'].push({
            name: 'lastModified',
            value: timestamp,
          });
        }
      },
    },
  };
}

async function getGitTimestamp(file: string): Promise<Date | undefined> {
  const cached = cache.get(file);
  if (cached) return cached;

  const timePromise = (async () => {
    const out = await x(
      'git',
      ['log', '-1', '--pretty="%ai"', path.relative(process.cwd(), file)],
      {
        throwOnError: true,
      },
    );

    return new Date(out.stdout);
  })();

  cache.set(file, timePromise);
  return timePromise.catch(() => undefined);
}
