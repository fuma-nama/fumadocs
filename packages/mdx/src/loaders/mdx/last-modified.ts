import path from 'node:path';
import { x } from 'tinyexec';
import type { DocCollectionItem } from '@/config/build';

/**
 * Obtain the last modified time of a file.
 *
 * @returns `null`/`undefined` when unknown (e.g. the file isn't committed).
 */
export type LastModifiedFn = (filePath: string) => Promise<Date | null | undefined>;

// cwd -> file -> time
const cache = new Map<string, Promise<Map<string, Date>>>();

/**
 * Resolve the `lastModified` collection option for a document.
 *
 * @returns `undefined` when the collection didn't opt in, or the date is unknown.
 */
export async function resolveLastModified(
  collection: DocCollectionItem | undefined,
  filePath: string,
): Promise<Date | undefined> {
  const option = collection?.lastModified;
  if (!option) return;

  if (typeof option === 'function') return (await option(filePath)) ?? undefined;
  const timestamps = await getGitTimestamps(collection.cwd);
  return timestamps.get(path.resolve(collection.cwd, filePath));
}

function getGitTimestamps(cwd: string): Promise<Map<string, Date>> {
  const cached = cache.get(cwd);
  if (cached) return cached;

  const promise = (async () => {
    const timestamps = new Map<string, Date>();
    // `--name-only` paths are relative to the repository root, not `cwd`
    const root = await x('git', ['rev-parse', '--show-toplevel'], { nodeOptions: { cwd } });
    if (root.exitCode !== 0) return timestamps;

    const out = await x(
      'git',
      ['-c', 'core.quotepath=off', 'log', '--format=commit:%aI', '--name-only'],
      {
        nodeOptions: { cwd },
      },
    );
    if (out.exitCode !== 0) return timestamps;

    // newest first: keep the first date seen for each file
    let date: Date | undefined;
    for (const line of out.stdout.split('\n')) {
      if (line.startsWith('commit:')) {
        const parsed = new Date(line.slice('commit:'.length));
        date = isNaN(parsed.getTime()) ? undefined : parsed;
      } else if (line.length > 0 && date) {
        const file = path.join(root.stdout.trim(), line);
        if (!timestamps.has(file)) timestamps.set(file, date);
      }
    }

    return timestamps;
  })();

  cache.set(cwd, promise);
  return promise;
}
