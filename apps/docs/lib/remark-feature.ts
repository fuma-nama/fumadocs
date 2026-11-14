import path from 'node:path';
import type { Code } from 'mdast';
import { defineMdastPlugin, type MdastVisitorContext, type MdxJsxFlowElement } from 'satteri';
import {
  addImport,
  addNextRewrites,
  addReactRouterRoute,
  addTanstackPrerender,
  enableProcessedMarkdown,
  parseSourceFile,
  type SourceFile,
} from '@fumadocs/cli/codemod';
import {
  docsLlms,
  internalPrefix,
  nextRewrites,
  reactRouterMiddleware,
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
import type {} from '@fumadocs/satteri/remark-show';
import { type Framework, frameworks } from './framework';
import { inFramework } from './remark-framework-links';

/** the Markdown of a source range, a function renders code like expressions of `props` */
type Replacement =
  | string
  | ((s: { expression: (code: string, fallback: string) => string }) => string);

declare module 'satteri' {
  interface DataMap {
    /** Markdown source edits read by `remark-llms` */
    _sourceEdits?: {
      start: number;
      end: number;
      /** a function to render code, an expression of `props` in pages that read them */
      text: Replacement;
    }[];
  }
}

/** the docs show the setup of a Fumadocs MDX source */
const src = sourceRef(false);

/** app directory of the framework templates */
const baseDirs: Record<Framework, string> = {
  next: '',
  'react-router': 'app',
  'tanstack-start': 'src',
  waku: 'src',
  astro: 'src',
};

const buildCommands: Record<Framework, string> = {
  next: 'next build',
  'react-router': 'react-router build',
  'tanstack-start': 'vite build',
  waku: 'waku build',
  astro: 'astro build',
};

const searchProviders = [
  'algolia',
  'orama-cloud',
  'meilisearch',
  'typesense',
  'mixedbread',
] as const;

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
const customDocuments = `import { source } from '@/lib/source';

async function getDocuments() {
  const documents = [];
  for (const page of source.getPages()) {
    documents.push({
      structured: await page.data.structuredData(),
      url: page.url,
      title: page.data.title,
      description: page.data.description,
    });
  }
  return documents;
}`;

interface FeatureFile {
  framework: Framework;
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

/** the files written by CLI features, keyed by `<feature>/<framework>/<file>`, and groups of them for every framework */
function featureFiles() {
  const groups: Record<string, FeatureFile[]> = {};
  const addGroup = (group: string, framework: Framework, entries: [string, string][]) => {
    const list = (groups[group] ??= []);
    for (const [title, value] of entries) list.push({ framework, title, value });
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
    'llms/docs-llms-prefixed.ts': `import { llms } from 'fumadocs-core/source';\n${docsLlms(src, '/llms.mdx')}\n`,
  };
  for (const { value: framework } of frameworks) {
    const baseDir = baseDirs[framework];
    const mcp = mcpRoute(framework);
    files[`mcp/${framework}/${mcp.file}`] = mcpTemplates(framework, mcp, src);

    const entries: [string, string][] = [];
    const routes: { path: string; entry: string }[] = [];
    const project = { framework, static: false };
    for (const { file, content, route } of templates(project, null, '/docs')) {
      entries.push([path.posix.join(baseDir, file), content]);
      if (route) routes.push({ path: route.path, entry: route.file });
    }
    if (internalPrefix(project))
      entries.push([
        path.posix.join(baseDir, 'lib/source.ts'),
        files['llms/docs-llms-prefixed.ts'],
      ]);
    if (framework === 'next') {
      entries.push([
        'next.config.ts',
        codemod(
          'next.config.ts',
          `import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
};

export default config;
`,
          (file) => addNextRewrites(file, nextRewrites('/docs', false)),
        ),
      ]);
    } else if (framework === 'react-router') {
      entries.push(
        [
          'app/routes.ts',
          codemod('routes.ts', routesConfig, (file) => addReactRouterRoute(file, routes)),
        ],
        [
          'app/root.tsx',
          codemod('root.tsx', "import type { Route } from './+types/root';\n", (file) => {
            addImport(file, { from: 'fumadocs-core/negotiation', named: ['isMarkdownPreferred'] });
            addImport(file, { from: '@/lib/source', named: ['docsLlms'] });
            file.s.append(reactRouterMiddleware);
          }),
        ],
      );
    }
    addGroup('llms/routes', framework, entries);
  }
  for (const { value: framework } of frameworks) {
    const baseDir = baseDirs[framework];
    const route = staticJson(framework);
    const routeFile = path.posix.join(baseDir, route.file);
    const output = staticOutput(framework, framework === 'tanstack-start' ? viteConfig : '');
    // collections are async in the React Router and TanStack Start templates, and on Astro
    const source = {
      dynamic: false,
      async:
        framework === 'react-router' || framework === 'tanstack-start' || framework === 'astro',
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
      addGroup(`search/${provider}`, framework, entries);
    }

    // Trieve takes the records of the Algolia integration
    addGroup('search/trieve', framework, [
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

    addGroup('search/custom', framework, [
      [routeFile, staticRoute(framework, customDocuments, 'getDocuments()')],
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
  return { files, groups };
}

/**
 * `<feature title="app/llms.txt/route.ts">llms/next/app/llms.txt/route.ts</feature>` embeds a file generated by Fumadocs CLI,
 * `<feature>search/algolia</feature>` embeds a group of them: the files of the page's framework as tabs, or a tab per
 * framework outside `[framework]`.
 */
export function remarkFeature() {
  const { files, groups } = featureFiles();
  const names = new Map<string, string>(frameworks.map((item) => [item.value, item.name]));

  return defineMdastPlugin({
    name: 'remark-feature',
    mdxJsxFlowElement(node, ctx) {
      if (node.name !== 'feature') return;
      const key = ctx.textContent(node).trim();
      const group = groups[key];
      const codes: Code[] = [];
      let nodes: (Code | MdxJsxFlowElement)[] = codes;
      /** the Markdown of the code blocks */
      let markdown = '';

      if (group && inFramework(ctx)) {
        // the files of each framework in a branch, the page shows those of its framework
        const branches = new Map<string, Code[]>();
        for (const file of group) {
          let list = branches.get(file.framework);
          if (!list) branches.set(file.framework, (list = []));
          // code meta is parsed like MDX, braces start an expression
          list.push(toCode(file.title, `tab="${file.title.replace(/[{}]/g, '\\$&')}"`, file.value));
        }
        nodes = [];
        const byFramework: Record<string, string> = {};
        for (const [framework, list] of branches) {
          nodes.push(show(`props.framework === ${JSON.stringify(framework)}`, list));
          byFramework[framework] = toMarkdown(list);
          markdown += (markdown ? '\n\n' : '') + byFramework[framework];
        }
        const code = `${JSON.stringify(byFramework)}[props.framework] ?? ""`;
        edit(ctx, node, (s) => s.expression(code, markdown));
      } else if (group) {
        for (const file of group)
          codes.push(
            toCode(
              file.title,
              `tab="${names.get(file.framework)}" title="${file.title}"`,
              file.value,
            ),
          );
        edit(ctx, node, toMarkdown(codes));
      } else {
        const value = files[key];
        if (value === undefined) throw new Error(`unknown feature file: ${key}`);

        const meta: string[] = [];
        for (const attr of node.attributes) {
          if (attr.type === 'mdxJsxAttribute' && typeof attr.value === 'string')
            meta.push(`${attr.name}="${attr.value}"`);
        }
        codes.push(toCode(key, meta.join(' '), value));
        edit(ctx, node, toMarkdown(codes));
      }

      ctx.replaceNode(node, nodes);
    },
  });
}

/** replace the Markdown of a node, for `remark-llms` */
function edit(ctx: MdastVisitorContext, node: MdxJsxFlowElement, text: Replacement) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start !== undefined && end !== undefined)
    (ctx.data._sourceEdits ??= []).push({ start, end, text });
}

function toMarkdown(codes: Code[]): string {
  const blocks: string[] = [];
  for (const code of codes) blocks.push(`\`\`\`${code.lang} ${code.meta}\n${code.value}\n\`\`\``);
  return blocks.join('\n\n');
}

/** a `<show>` branch, Remark Show turns it into a condition checked when rendering */
function show(when: string, children: Code[]): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name: 'show',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'when',
        value: { type: 'mdxJsxAttributeValueExpression', value: when },
      },
    ],
    children,
  };
}

function toCode(file: string, meta: string, value: string): Code {
  return { type: 'code', lang: path.extname(file).slice(1), meta, value };
}
