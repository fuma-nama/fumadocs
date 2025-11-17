import path from 'node:path';
import { x } from 'tinyexec';
import type { Plugin } from '@/core';
import { ident } from '@/utils/codegen';

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

  return {
    name: 'last-modified',
    'index-file': {
      generateTypeConfig() {
        const lines: string[] = [];
        lines.push('{');
        lines.push('  DocData: {');
        for (const collection of this.core.getConfig().collectionList) {
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
    doc: {
      async vfile(file) {
        if (!filter(this.collection.name)) return;

        if (versionControl === 'git') {
          const timestamp = await getGitTimestamp(this.filePath);
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
