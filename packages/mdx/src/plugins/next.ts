import type { LoadedConfig } from '@/config/build';
import type { Plugin } from '@/core';
import { generateIndexFile } from '@/utils/generate-index-file';

export default function next(): Plugin {
  let config: LoadedConfig;
  let shouldEmitOnChange = false;

  return {
    name: 'next',
    config(v) {
      config = v;

      // always emit again when async mode enabled
      shouldEmitOnChange = config.collectionList.some((collection) => {
        return (
          (collection.type === 'doc' && collection.async) ||
          collection.type === 'docs' ||
          collection.type === 'meta'
        );
      });
    },
    configureServer(server) {
      if (!server.watcher) return;

      server.watcher.on('all', async (event) => {
        if (event === 'change' && !shouldEmitOnChange) return;

        await this.core.emitAndWrite({
          filterPlugin: (plugin) => plugin.name === 'next',
        });
      });
    },
    async emit() {
      return [
        {
          path: 'index.ts',
          // TODO: implement lazy entries for Turbopack, and meta entries validation.
          content: await generateIndexFile({
            config,
            configPath: this.configPath,
            outDir: this.outDir,
            target: 'node',
          }),
        },
      ];
    },
  };
}

/*
import { createHash } from 'node:crypto';
import { validate } from '@/utils/validation';
import { readFileWithCache } from '@/next/file-cache';
import { getGitTimestamp } from '@/utils/git-timestamp';
import { fumaMatter } from '@/utils/fuma-matter';
import { getImportCode } from '@/utils/import-formatter';
import type { FileInfo } from '@/runtime/server';

export async function indexFile(
  configPath: string,
  config: LoadedConfig,
): Promise<string> {
  const lines: string[] = [
    getImportCode({
      type: 'named',
      specifier: 'fumadocs-mdx/runtime/async',
      names: ['_runtimeAsync', 'buildConfig'],
    }),
    'const _sourceConfig = buildConfig(_source)',
    getImportCode({
      type: 'default',
      name: 'path',
      specifier: 'node:path',
    }),
  ];
  async function getAsyncEntries(
    collection: DocCollectionItem,
    files: FileInfo[],
  ) {
    const entries = files.map(async (file) => {
      const content = await readFileWithCache(file.fullPath).catch(() => '');
      const parsed = fumaMatter(content);
      let data = parsed.data;

      if (collection.schema) {
        data = await validate(
          collection.schema,
          parsed.data,
          { path: file.fullPath, source: parsed.content },
          `invalid frontmatter in ${file.fullPath}`,
        );
      }

      let lastModified: Date | undefined;
      if (config.global?.lastModifiedTime === 'git') {
        lastModified = await getGitTimestamp(file.fullPath);
      }

      const hash = createHash('md5').update(content).digest('hex');
      const infoStr: string[] = [];
      for (const [k, v] of Object.entries({ ...file, hash })) {
        infoStr.push(`${k}: ${JSON.stringify(v)}`);
      }
      infoStr.push(
        `absolutePath: path.resolve(${JSON.stringify(file.fullPath)})`,
      );

      return `{ info: { ${infoStr.join(', ')} }, lastModified: ${JSON.stringify(lastModified)}, data: ${JSON.stringify(data)} }`;
    });

    return Promise.all(entries);
  }

  return lines.join('\n');
}
*/
