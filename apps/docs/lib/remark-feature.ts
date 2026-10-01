import path from 'node:path';
import type { Code } from 'mdast';
import { defineMdastPlugin } from 'satteri';
import {
  addNextRewrites,
  addReactRouterRoute,
  addTanstackPrerender,
  enableProcessedMarkdown,
  parseSourceFile,
  type SourceFile,
} from '@fumadocs/cli/codemod';
import {
  docsLlms,
  llmsRoutes,
  markdownRewrite,
  markdownUrl,
  tanstackMarkdownUrl,
  templates,
} from '@fumadocs/cli/features/llms';
import { mcpRoute, templates as mcpTemplates } from '@fumadocs/cli/features/mcp';
import {
  staticJson,
  staticOutput,
  staticRoute,
  syncCommand,
  syncScript,
  templates as searchTemplates,
} from '@fumadocs/cli/features/search';
import { sourceRef } from '@fumadocs/cli/features/utils';
import { component as webmcp } from '@fumadocs/cli/features/webmcp';

declare module 'satteri' {
  interface DataMap {
    /** Markdown source edits read by `remark-llms` */
    _sourceEdits?: { start: number; end: number; text: string }[];
  }
}

const frameworks = ['next', 'react-router', 'tanstack-start', 'waku'] as const;

/** the docs show the setup of a Fumadocs MDX source */
const src = sourceRef(false);

/** app directory of the framework templates */
const baseDirs = { next: '', 'react-router': 'app', 'tanstack-start': 'src', waku: 'src' };

const frameworkNames = {
  next: 'Next.js',
  'react-router': 'React Router',
  'tanstack-start': 'Tanstack Start',
  waku: 'Waku',
};

const buildCommands = {
  next: 'next build',
  'react-router': 'react-router build',
  'tanstack-start': 'vite build',
  waku: 'waku build',
};

const searchProviders = ['algolia', 'orama-cloud', 'meilisearch', 'typesense'] as const;

const routesConfig = `import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
] satisfies RouteConfig;
`;

const viteConfig = `import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    nitro({
      preset: 'vercel',
    }),
  ],
});
`;

/** builds the documents of a custom search integration in the `static.json` route */
const customDocuments = (async: boolean) => `import { source } from '@/lib/source';

async function getDocuments() {
  const documents = [];
  for (const page of source.getPages()) {
    documents.push({
      structured: ${async ? 'await page.data.structuredData()' : 'page.data.structuredData'},
      url: page.url,
      title: page.data.title,
      description: page.data.description,
    });
  }
  return documents;
}`;

interface FeatureTab {
  tab: string;
  title: string;
  value: string;
}

/** apply a codemod to a stub file, with the inserted lines highlighted */
function codemod(name: string, code: string, edit: (file: SourceFile) => void) {
  const file = parseSourceFile(name, code);
  edit(file);
  const before = code.split('\n');
  const after = file.s.toString().split('\n');
  let start = 0;
  while (before[start] === after[start]) start++;
  let end = 0;
  while (before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  after[start] += ` // [!code ++:${after.length - start - end}]`;
  return after.join('\n');
}

/** the files written by CLI features, keyed by `<feature>/<framework>/<file>`, and tab groups of them per framework */
function featureFiles() {
  const tabs: Record<string, FeatureTab[]> = {};
  const addTabs = (
    group: string,
    framework: (typeof frameworks)[number],
    entries: [string, string][],
  ) => {
    const list = (tabs[group] ??= []);
    for (const [title, value] of entries)
      list.push({ tab: frameworkNames[framework], title, value });
  };
  const files: Record<string, string> = {
    'llms/docs-llms.ts': `import { llms } from 'fumadocs-core/source';\n${docsLlms(src)}\n`,
    'llms/source.config.ts': codemod(
      'source.config.ts',
      `import { defineDocs } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content/docs',
});
`,
      enableProcessedMarkdown,
    ),
  };
  for (const framework of frameworks) {
    const base = `llms/${framework}`;
    const tanstack = framework === 'tanstack-start';
    files[`webmcp/${framework}/components/webmcp.tsx`] = webmcp({
      static: false,
      i18n: false,
      tanstack,
    });
    const mcp = mcpRoute(framework);
    files[`mcp/${framework}/${mcp.file}`] = mcpTemplates(framework, mcp, src);
    const routes = llmsRoutes(framework, null, '/docs', '/llms.mdx/docs');
    for (const [route, content] of templates(framework, routes, false, src)) {
      files[`${base}/${route.file}`] = content;
    }
    if (tanstack) {
      files[`${base}/lib/shared.ts`] =
        `import { createGetUrl } from 'fumadocs-core/source';\n\nexport const docsRoute = '/docs';\n${tanstackMarkdownUrl(false)}\n`;
      continue;
    }
    files[`${base}/lib/shared.ts`] =
      `import { createGetUrl } from 'fumadocs-core/source';\n\nexport const docsContentRoute = '/llms.mdx/docs';\n${markdownUrl(false)}\n`;
    if (framework === 'react-router') {
      files[`${base}/routes.ts`] = codemod('routes.ts', routesConfig, (file) =>
        addReactRouterRoute(
          file,
          Object.values(routes).map((route) => ({ path: route.path, entry: route.file })),
        ),
      );
    }
    if (framework === 'next') {
      files[`${base}/next.config.ts`] = codemod(
        'next.config.ts',
        `import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
`,
        (file) => addNextRewrites(file, [markdownRewrite('/docs', routes.markdown, false)]),
      );
    }
  }

  for (const framework of frameworks) {
    const baseDir = baseDirs[framework];
    const route = staticJson(framework);
    const routeFile = path.posix.join(baseDir, route.file);
    const output = staticOutput(framework, framework === 'tanstack-start' ? viteConfig : '');
    // collections are async in the React Router and TanStack Start templates
    const source = {
      dynamic: false,
      async: framework === 'react-router' || framework === 'tanstack-start',
      dir: 'content/docs',
    };
    const registration: [string, string][] = [];
    if (framework === 'react-router') {
      registration.push([
        path.posix.join(baseDir, 'routes.ts'),
        codemod('routes.ts', routesConfig, (file) =>
          addReactRouterRoute(file, [{ path: route.path, entry: route.file }]),
        ),
      ]);
    } else if (framework === 'tanstack-start') {
      registration.push([
        'vite.config.ts',
        codemod('vite.config.ts', viteConfig, (file) => addTanstackPrerender(file, [route.path])),
      ]);
    }
    const packageJson: [string, string] = [
      'package.json',
      JSON.stringify(
        { scripts: { build: `${buildCommands[framework]} && ${syncCommand}` } },
        null,
        2,
      ),
    ];

    for (const provider of searchProviders) {
      const entries: [string, string][] = [];
      for (const [file, value] of searchTemplates(
        provider,
        framework,
        { baseDir, source },
        output,
      )) {
        // the search dialog is shown on Search UI pages
        if (file.endsWith('components/search.tsx')) continue;
        entries.push([file, value]);
        if (file === routeFile) entries.push(...registration);
      }
      entries.push(packageJson);
      addTabs(`search/${provider}`, framework, entries);
    }

    // Trieve takes the records of the Algolia integration
    addTabs('search/trieve', framework, [
      [
        routeFile,
        staticRoute(
          framework,
          "import { source } from '@/lib/source';\nimport { toDocuments } from 'fumadocs-core/search/algolia';",
          'toDocuments(source)',
        ),
      ],
      ...registration,
      [
        'scripts/sync-content.ts',
        syncScript(
          output,
          `import { sync, type TrieveDocument as DocumentRecord } from 'trieve-fumadocs-adapter/search/sync';
import { TrieveSDK } from 'trieve-ts-sdk';`,
          `const client = new TrieveSDK({
  apiKey: process.env.TRIEVE_ADMIN_API_KEY!,
  datasetId: process.env.TRIEVE_DATASET_ID!,
});

await sync(client, records);
`,
        ),
      ],
      packageJson,
    ]);

    addTabs('search/custom', framework, [
      [routeFile, staticRoute(framework, customDocuments(source.async), 'getDocuments()')],
      ...registration,
      [
        'scripts/sync-content.ts',
        syncScript(
          output,
          `import type { StructuredData } from 'fumadocs-core/mdx-plugins';

interface DocumentRecord {
  title: string;
  description?: string;
  url: string;
  structured: StructuredData;
}`,
          '// sync the records to your search engine\n',
        ),
      ],
      packageJson,
    ]);
  }
  return { files, tabs };
}

/**
 * `<feature tab="Next.js" title="app/llms.txt/route.ts">llms/next/app/llms.txt/route.ts</feature>` embeds a file generated by Fumadocs CLI,
 * `<feature>search/algolia</feature>` embeds a tab group of them.
 */
export function remarkFeature() {
  const { files, tabs } = featureFiles();

  return defineMdastPlugin({
    name: 'remark-feature',
    mdxJsxFlowElement(node, ctx) {
      if (node.name !== 'feature') return;
      const key = ctx.textContent(node).trim();
      const codes: Code[] = [];
      const group = tabs[key];

      if (group) {
        for (const { tab, title, value } of group)
          codes.push(toCode(title, `tab="${tab}" title="${title}"`, value));
      } else {
        const value = files[key];
        if (value === undefined) throw new Error(`unknown feature file: ${key}`);

        const meta: string[] = [];
        for (const attr of node.attributes) {
          if (attr.type === 'mdxJsxAttribute' && typeof attr.value === 'string')
            meta.push(`${attr.name}="${attr.value}"`);
        }
        codes.push(toCode(key, meta.join(' '), value));
      }

      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) {
        const blocks: string[] = [];
        for (const code of codes)
          blocks.push(`\`\`\`${code.lang} ${code.meta}\n${code.value}\n\`\`\``);
        (ctx.data._sourceEdits ??= []).push({ start, end, text: blocks.join('\n\n') });
      }
      ctx.replaceNode(node, codes);
    },
  });
}

function toCode(file: string, meta: string, value: string): Code {
  return { type: 'code', lang: path.extname(file).slice(1), meta, value };
}
