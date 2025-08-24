import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs';
import remarkMath from 'remark-math';
import { remarkTypeScriptToJavaScript } from 'fumadocs-docgen/remark-ts2js';
import rehypeKatex from 'rehype-katex';
import { z } from 'zod';
import {
  rehypeCodeDefaultOptions,
  remarkSteps,
} from 'fumadocs-core/mdx-plugins';
import { remarkAutoTypeTable } from 'fumadocs-typescript';
import { ElementContent } from 'hast';
import { remarkWikilink, type RemarkWikilinkOptions } from 'fumadocs-wikilink';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const docs = defineDocs({
  docs: {
    async: true,
    schema: frontmatterSchema.extend({
      preview: z.string().optional(),
      index: z.boolean().default(false),
      /**
       * API routes only
       */
      method: z.string().optional(),
    }),
  },
  meta: {
    schema: metaSchema.extend({
      description: z.string().optional(),
    }),
  },
});

export const blog = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  async: true,
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()),
  }),
});

export default defineConfig({
  lastModifiedTime: 'git',
  mdxOptions: {
    rehypeCodeOptions: {
      lazy: true,
      experimentalJSEngine: true,
      langs: ['ts', 'js', 'html', 'tsx', 'mdx'],
      inline: 'tailing-curly-colon',
      themes: {
        light: 'catppuccin-latte',
        dark: 'catppuccin-mocha',
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
        }),
        {
          name: '@shikijs/transformers:remove-notation-escape',
          code(hast) {
            function replace(node: ElementContent): void {
              if (node.type === 'text') {
                node.value = node.value.replace('[\\!code', '[!code');
              } else if ('children' in node) {
                for (const child of node.children) {
                  replace(child);
                }
              }
            }

            replace(hast);
            return hast;
          },
        },
      ],
    },
    remarkCodeTabOptions: {
      parseMdx: true,
    },
    remarkNpmOptions: {
      persist: {
        id: 'package-manager',
      },
    },
    remarkPlugins: [
      [remarkWikilink, buildKeyLinkMapFromDocs()],
      remarkSteps,
      remarkMath,
      remarkAutoTypeTable,
      remarkTypeScriptToJavaScript,
    ],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});

function buildKeyLinkMapFromDocs(): RemarkWikilinkOptions {
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
        const m = /---([\s\S]*?)---/m.exec(raw);
        const front = m ? m[1] : '';
        const title = /\ntitle:\s*(.+)\n/.exec(front)?.[1]?.trim();
        const slug = /\nslug:\s*(.+)\n/.exec(front)?.[1]?.trim();
        const aliasesLine = /\naliases:\s*\[([^\]]*)\]/.exec(front)?.[1] ?? '';
        const aliases = aliasesLine
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);

        const keys: string[] = [];
        if (title) keys.push(title);
        if (slug) keys.push(slug);
        for (const a of aliases) keys.push(a);
        const last = slugs[slugs.length - 1];
        if (last) keys.push(last.replace(/[-_]/g, ' '));
        for (const key of keys) map[key] = url;
      } catch {
        // ignore
      }
    }
  }

  scan(root);
  return { keyLinkMap: map } satisfies RemarkWikilinkOptions;
}
