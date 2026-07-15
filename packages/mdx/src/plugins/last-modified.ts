import path from 'node:path';
import { x } from 'tinyexec';
import type { Plugin } from '@/core';
import { ident } from '@/utils/codegen';

// one batched `git log` pass per cwd: per-file `git log -1` walks the history
// for every document, which dominates build time on large repos.
const cache = new Map<string, Promise<Map<string, Date>>>();
type VersionControlFn = (filePath: string) => Promise<Date | null | undefined>;

export interface LastModifiedPluginOptions {
  /**
   * Version control to obtain the last modified time.
   *
   * - `git`: Requires `git` to be installed.
   *
   *    If you are using Vercel, please set `VERCEL_DEEP_CLONE` environment variable to `true`.
   *
   * - A function: return the last modified time for given file path.
   *
   * @defaultValue 'git'
   */
  versionControl?: 'git' | VersionControlFn;

  /**
   * Filter the collections to include by names
   */
  filter?: (collection: string) => boolean;
}

const ExtendTypes = `{
  /**
   * Last modified date of document file, obtained from version control.
   *
   */
  lastModified?: Date;
}`;

/**
 * Injects `lastModified` property to page exports.
 */
export default function lastModified(options: LastModifiedPluginOptions = {}): Plugin {
  const { versionControl = 'git', filter = () => true } = options;
  let fn: VersionControlFn;

  return {
    name: 'last-modified',
    'index-file': {
      generateTypeConfig() {
        const lines: string[] = [];
        lines.push('{');
        lines.push('  DocData: {');
        for (const collection of this.core.getCollections()) {
          if (filter(collection.name)) {
            lines.push(ident(`${collection.name}: ${ExtendTypes},`, 2));
          }
        }
        lines.push('  }');
        lines.push('}');
        return lines.join('\n');
      },
      serverOptions(options) {
        options.doc ??= {};
        options.doc.passthroughs ??= [];
        options.doc.passthroughs.push('lastModified');
      },
    },
    config() {
      const workspace = this.core.workspace;
      const cwd = workspace ? path.resolve(workspace.dir) : process.cwd();

      switch (versionControl) {
        case 'git':
          fn = (v) => getGitTimestamp(v, cwd);
          break;
        default:
          fn = versionControl;
      }
    },
    doc: {
      async vfile(file) {
        if (!filter(this.collection.name)) return;
        // the collection opted in through its own `lastModified` option, which already exports it
        if (this.collection.lastModified) return;

        const timestamp = await fn(this.filePath);
        if (timestamp) {
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

/**
 * @internal also used by the built-in `lastModified` collection option, sharing the batched cache
 */
export async function getGitTimestamp(file: string, cwd: string): Promise<Date | null> {
  const timestamps = await getGitTimestamps(cwd);
  return timestamps.get(path.resolve(cwd, file)) ?? null;
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
