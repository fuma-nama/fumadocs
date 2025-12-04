import path from 'node:path';
import { x } from 'tinyexec';
import type { Plugin } from '@/core';
import { ident } from '@/utils/codegen';

const cache = new Map<string, Promise<Date | null>>();
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
export default function lastModified(
  options: LastModifiedPluginOptions = {},
): Plugin {
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
      const { workspace } = this.core.getOptions();
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

async function getGitTimestamp(
  file: string,
  cwd: string,
): Promise<Date | null> {
  const cached = cache.get(file);
  if (cached) return cached;

  const timePromise = (async () => {
    const out = await x(
      'git',
      ['log', '-1', '--pretty="%ai"', path.relative(cwd, file)],
      {
        nodeOptions: {
          cwd,
        },
      },
    );

    if (out.exitCode !== 0) return null;
    const date = new Date(out.stdout);
    return isNaN(date.getTime()) ? null : date;
  })();

  cache.set(file, timePromise);
  return timePromise;
}
