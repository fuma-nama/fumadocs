import type { LoadedConfig } from '@/utils/config';
import type {
  DocCollection,
  DocsCollection,
  GlobalConfig,
  MetaCollection,
} from '@/config/define';
import type { ProcessorOptions } from '@mdx-js/mdx';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fumaMatter } from '@/utils/fuma-matter';

export function buildConfig(config: Record<string, unknown>): LoadedConfig {
  const collections: LoadedConfig['collections'] = new Map();
  let globalConfig: LoadedConfig['global'] = {};

  for (const [k, v] of Object.entries(config)) {
    if (!v) {
      continue;
    }

    if (typeof v === 'object' && 'type' in v) {
      if (v.type === 'docs') {
        collections.set(k, v as DocsCollection);
        continue;
      }

      if (v.type === 'doc' || v.type === 'meta') {
        collections.set(k, v as unknown as MetaCollection | DocCollection);
        continue;
      }
    }

    if (k === 'default' && v) {
      globalConfig = v as GlobalConfig;
      continue;
    }

    throw new Error(
      `Unknown export "${k}", you can only export collections from source configuration file.`,
    );
  }

  const mdxOptionsCache = new Map<string, Promise<ProcessorOptions>>();
  return {
    global: globalConfig,
    collections,
    async getDefaultMDXOptions(mode = 'default'): Promise<ProcessorOptions> {
      const cached = mdxOptionsCache.get(mode);
      if (cached) return cached;

      const input = this.global.mdxOptions;
      async function uncached(): Promise<ProcessorOptions> {
        const options = typeof input === 'function' ? await input() : input;
        const { getDefaultMDXOptions } = await import('@/utils/mdx-options');

        if (options?.preset === 'minimal') return options;

        const inferredKeyMap = buildKeyLinkMapFromDocs();
        const withWikilink = {
          ...options,
          // preserve user override if provided
          remarkWikilinkOptions:
            options?.remarkWikilinkOptions ??
            (Object.keys(inferredKeyMap).length > 0
              ? { keyLinkMap: inferredKeyMap }
              : undefined),
        } as Parameters<typeof getDefaultMDXOptions>[0];

        return getDefaultMDXOptions({
          ...withWikilink,
          _withoutBundler: mode === 'remote',
        });
      }

      const result = uncached();
      mdxOptionsCache.set(mode, result);
      return result;
    },
  };
}

function buildKeyLinkMapFromDocs(): Record<string, string> {
  // Scan conventional docs directories and build a key -> URL map.
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'apps/docs/content/docs'),
    path.join(cwd, 'content/docs'),
  ];

  const root = candidates.find((p) => fs.existsSync(p));
  if (!root) return {};

  const map: Record<string, string> = {};

  function scan(dir: string, segments: string[] = []): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // Skip route groups like (group)
        if (entry.name.startsWith('(')) continue;
        scan(path.join(dir, entry.name), [...segments, encodeURI(entry.name)]);
        continue;
      }

      if (!entry.name.endsWith('.mdx')) continue;

      const filePath = path.join(dir, entry.name);
      const base = path.basename(entry.name, '.mdx');
      const slugs =
        base === 'index' ? [...segments] : [...segments, encodeURI(base)];
      const url = `/docs/${slugs.join('/')}`;

      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = fumaMatter(raw).data as
          | {
              title?: unknown;
              aliases?: unknown;
              slug?: unknown;
            }
          | undefined;

        const keys: string[] = [];
        if (typeof data?.title === 'string') keys.push(data.title);
        if (Array.isArray(data?.aliases)) {
          for (const a of data.aliases)
            if (typeof a === 'string' && a) keys.push(a);
        }
        if (typeof data?.slug === 'string') keys.push(data.slug);
        const last = slugs[slugs.length - 1];
        if (last) keys.push(last.replace(/[-_]/g, ' '));

        for (const key of keys) map[key] = url;
      } catch {
        // ignore parse/frontmatter errors and continue
      }
    }
  }

  scan(root);
  return map;
}
