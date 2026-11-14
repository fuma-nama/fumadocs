import fs from 'node:fs/promises';
import path from 'node:path';
import type { Feature } from '@/features';
import type { I18nInfo, Project } from '@/project';
import {
  type FormattedRoute,
  formatRoute,
  reactRouterTypes,
  type RouteDescriptor,
  routeModule,
} from '@/project/route';
import { addImport, addNextRewrites } from '@/codemod';
import { docs } from './docs';
import {
  addExport,
  editOrNote,
  extendNextProxy,
  includeProcessedMarkdown,
  type SourceRef,
  sourceRef,
  registerReactRouterRoutes,
  requiresMarkdown,
} from './utils';

/**
 * Static Next.js, React Router and Waku can't serve files beside the docs pages, like `/docs/page.md`, without a
 * server. They serve the files under this prefix instead, e.g. `/llms.mdx/docs/page.md`.
 */
export const internalPrefix = ({
  framework,
  static: isStatic,
}: Pick<Project, 'framework' | 'static'>) =>
  framework === 'react-router' || framework === 'waku' || (framework === 'next' && isStatic)
    ? '/llms.mdx'
    : '';

/** runtime content sources expose raw Markdown as `page.data.content`, Fumadocs MDX processes it */
export const docsLlms = ({ dynamic, ref }: SourceRef, prefix = '') => `
export const docsLlms = llms(${ref}, {
  renderPage: ${dynamic ? '(page)' : 'async (page)'} => \`# \${page.data.title} (\${page.url})

\${${dynamic ? 'page.data.content' : "await page.data.getText('processed')"}}\`,${
  prefix
    ? `
  // link to the files under \`${prefix}\`
  renderUrl: (item) => (/^\\/.*(\\.md|\\/llms-full\\.txt)$/.test(item.url) ? \`${prefix}\${item.url}\` : item.url),`
    : ''
}
});`;

const imports = `import { docsLlms } from '@/lib/source';`;
const serve = (file: string) => `(await docsLlms.serve(${file}))`;
const orNotFound = 'new Response(null, { status: 404 })';

/** responds with a file of `docsLlms`, or a page as Markdown when the request prefers it */
const middlewareBody = (
  pathname: string,
  request: string,
) => `const file = await docsLlms.serve(${pathname});
  if (file) return file;

  const markdown = isMarkdownPreferred(${request}) && ${serve(`\`\${${pathname}}.md\``)};
  if (markdown) {
    // this URL has two representations, selected by \`Accept\`
    markdown.headers.set('Vary', 'Accept');
    return markdown;
  }`;

/** the middleware in `root.tsx`, it runs for matched routes like `/docs/*` */
export const reactRouterMiddleware = `
/** serve the files of \`docsLlms\` at their paths, and docs pages as Markdown to clients that prefer it */
const llmsMiddleware: Route.MiddlewareFunction = async ({ request }) => {
  const { pathname } = new URL(request.url);
  ${middlewareBody('pathname', 'request')}
};

export const middleware = [llmsMiddleware];
`;

const wakuMiddleware = `import type { MiddlewareHandler } from 'hono';
import { isMarkdownPreferred } from 'fumadocs-core/negotiation';
${imports}

/** serve the files of \`docsLlms\` at their paths, and docs pages as Markdown to clients that prefer it */
export default function llmsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    ${middlewareBody('c.req.path', 'c.req.raw').replace(/\n(?=.)/g, '\n  ')}

    await next();
  };
}
`;

/** `/llms.mdx/[...path]`, under `[lang]` when the i18n middleware adds the locale to request paths */
const nextRoute = (
  route: FormattedRoute,
  i18n: boolean,
) => `${imports}${i18n ? "\nimport { i18n } from '@/lib/i18n';" : ''}

export const revalidate = false;
// other paths are 404s, never cached responses
export const dynamicParams = false;

export async function GET(_req: Request, { params }: RouteContext<'${route.path}'>) {
  const { ${i18n ? 'lang, ' : ''}path } = await params;
  ${
    i18n
      ? `// the URLs of a language may hide its locale
  const file =
    ${serve("`/${lang}/${path.join('/')}`, lang")} ?? ${serve("`/${path.join('/')}`, lang")};
  return file`
      : `return ${serve("`/${path.join('/')}`")}`
  } ?? ${orNotFound};
}

export async function generateStaticParams() {
  const params: { ${i18n ? 'lang: string; ' : ''}path: string[] }[] = [];
  ${
    i18n
      ? `for (const lang of i18n.languages) {
    for (const file of await docsLlms.files(lang)) {
      // \`/llms.txt\` and \`/llms-full.txt\` have their own routes
      if (/^\\/llms(-full)?\\.txt$/.test(file)) continue;
      const path = decodeURI(file).slice(1).split('/');
      if (path[0] === lang) path.shift();
      params.push({ lang, path });
    }
  }`
      : `for (const file of await docsLlms.files()) {
    // \`/llms.txt\` and \`/llms-full.txt\` have their own routes
    if (!/^\\/llms(-full)?\\.txt$/.test(file)) params.push({ path: decodeURI(file).slice(1).split('/') });
  }`
  }
  return params;
}
`;

/** `/llms.mdx/[...path]` of Waku, prerendered for static deployments */
const wakuRoute = (route: FormattedRoute) => `import type { ApiContext } from 'waku/router';
${imports}

export async function GET(_: Request, { params }: ApiContext<'${route.path}'>) {
  return ${serve("`/${params.path.join('/')}`")} ?? ${orNotFound};
}

export async function getConfig() {
  const staticPaths: string[][] = [];
  for (const file of await docsLlms.files()) {
    // \`/llms.txt\` and \`/llms-full.txt\` have their own routes
    if (!/^\\/llms(-full)?\\.txt$/.test(file)) staticPaths.push(decodeURI(file).slice(1).split('/'));
  }
  return { render: 'static' as const, staticPaths } as const;
}
`;

const astroRoute = `import type { APIRoute, GetStaticPaths } from 'astro';
${imports}

export const prerender = true;

export const getStaticPaths = (async () => {
  const paths: { params: { path: string } }[] = [];
  for (const path of await docsLlms.files()) paths.push({ params: { path: decodeURI(path.slice(1)) } });
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => ${serve('`/${params.path}`')}!;
`;

/** Next.js rewrites the public paths of files under the docs to the `/llms.mdx/[...path]` route */
export const nextRewrites = (docsRoute: string, i18n: boolean) => {
  const lang = i18n ? '/:lang' : '';
  return [
    {
      source: `${lang}${docsRoute}/:path*.md`,
      destination: `${lang}/llms.mdx${docsRoute}/:path*.md`,
    },
    // sections like `/cn/llms-full.txt` are outside the docs
    {
      source: `${lang}${i18n ? '' : docsRoute}/:path*/llms-full.txt`,
      destination: `${lang}/llms.mdx${i18n ? '' : docsRoute}/:path*/llms-full.txt`,
    },
  ];
};

/** the files written by the feature */
export function templates(
  project: Pick<Project, 'framework' | 'static'>,
  i18n: I18nInfo | null,
  docsRoute: string,
) {
  const { framework } = project;
  if (framework === 'astro')
    return [
      { file: formatRoute({ segments: ['[...path]'] }, framework, i18n).file, content: astroRoute },
    ];
  const out: { file: string; content: string; route?: FormattedRoute }[] = [];
  const add = (descriptor: RouteDescriptor, content: (route: FormattedRoute) => string) => {
    const route = formatRoute(descriptor, framework, i18n);
    out.push({ file: route.file, content: content(route), route });
  };
  if (framework === 'tanstack-start') {
    // the docs page `$` takes the paths under the docs unless a route is more specific
    const routes: RouteDescriptor[] = [
      { segments: ['llms.txt'] },
      { segments: ['llms-full.txt'] },
      { segments: ['{$}.md'] },
      { segments: [docsRoute, '{$}.md'], locale: true },
      { segments: [docsRoute, '{$}llms-full.txt'], locale: true },
    ];
    // sections outside the docs, like `/cn/llms-full.txt`
    if (i18n) routes.push({ segments: ['{$}llms-full.txt'] });
    for (const descriptor of routes) {
      add(descriptor, (route) =>
        routeModule(framework, route, {
          imports,
          body: `${serve('new URL(request.url).pathname')} ?? ${orNotFound}`,
          request: true,
        }),
      );
    }
    return out;
  }

  for (const file of ['/llms.txt', '/llms-full.txt']) {
    add({ segments: [file] }, (route) =>
      routeModule(framework, route, {
        imports,
        body: `${serve(`'${file}'`)}!`,
        revalidate: true,
        static: true,
      }),
    );
  }
  if (framework === 'waku') {
    add({ segments: ['llms.mdx', { param: 'path', catchAll: true }] }, wakuRoute);
    // serves the files at their paths and negotiates `Accept` on a server
    out.push({ file: 'middleware/llms.ts', content: wakuMiddleware });
  } else if (framework === 'next') {
    const withLocale = i18n !== null && !project.static;
    add(
      { segments: ['llms.mdx', { param: 'path', catchAll: true }], locale: withLocale },
      (route) => nextRoute(route, withLocale),
    );
  } else {
    add(
      { segments: ['llms.mdx', '*'] },
      (route) => `${reactRouterTypes(route)}
${imports}

export async function loader({ params }: Route.LoaderArgs) {
  return ${serve("`/${params['*']}`")} ?? ${orNotFound};
}
`,
    );
  }
  return out;
}

export const llms: Feature = {
  id: 'llms',
  title: 'LLM Routes',
  description: 'serve docs as Markdown for LLMs: llms.txt, llms-full.txt and per-page Markdown',
  requires: [docs],
  supports: requiresMarkdown,
  // `mcp` and `webmcp` import `docsLlms`
  async detect({ cwd, baseDir }) {
    const content = await fs
      .readFile(path.join(cwd, baseDir, 'lib/source.ts'), 'utf-8')
      .catch(() => '');
    return /export const docsLlms\b/.test(content);
  },
  async apply(ctx) {
    const { baseDir, i18n, source, framework, configFile } = ctx.project;
    const sourceFile = path.join(baseDir, 'lib/source.ts');
    const prefix = internalPrefix(ctx.project);
    // runtime content sources already give raw Markdown
    await includeProcessedMarkdown(ctx);
    if (await addExport(ctx, sourceFile, 'docsLlms', docsLlms(sourceRef(source.dynamic), prefix))) {
      await ctx.source(sourceFile, (file) =>
        addImport(file, { from: 'fumadocs-core/source', named: ['llms'] }),
      );
    }

    const docsRoute = source.baseUrl.replace(/\/$/, '');
    const files = templates(ctx.project, i18n, docsRoute);
    const routes: FormattedRoute[] = [];
    for (const { file, content, route } of files) {
      await ctx.write(path.join(baseDir, file), content);
      if (route) routes.push(route);
    }

    if (framework === 'react-router') {
      await registerReactRouterRoutes(ctx, routes);
      if (!ctx.project.static)
        await editOrNote(
          ctx,
          path.join(baseDir, 'root.tsx'),
          (file) => {
            if (file.code.includes('docsLlms')) return;
            if (/export const middleware\b/.test(file.code)) return false;
            file.s.append(reactRouterMiddleware);
            addImport(file, { from: 'fumadocs-core/negotiation', named: ['isMarkdownPreferred'] });
            addImport(file, { from: '@/lib/source', named: ['docsLlms'] });
          },
          `Add this middleware to your root route:\n${reactRouterMiddleware}`,
        );
    } else if (framework === 'waku') {
      ctx.addDependencies({ hono: null }, true);
    } else if (framework === 'next' && !ctx.project.static) {
      const rewrites = nextRewrites(docsRoute, i18n !== null);
      await editOrNote(
        ctx,
        configFile,
        (file) => file.code.includes('llms.mdx') || addNextRewrites(file, rewrites),
        `Rewrite the files under the docs in your Next.js config:\n  ${rewrites.map((item) => `${item.source} -> ${item.destination}`).join('\n  ')}`,
      );
      // the i18n middleware adds the locale to the root page, like it does for docs pages
      if (i18n) await extendNextProxy(ctx, [`${docsRoute}.md`]);
    }

    // SPA mode only serves prerendered files
    if (ctx.project.static && (framework === 'react-router' || framework === 'tanstack-start'))
      ctx.note(
        'Prerender the files of `docsLlms`, see https://fumadocs.dev/docs/integrations/llms#static-output.',
      );
    ctx.note(
      `Add page actions to your docs page with \`MarkdownCopyButton\` and \`ViewOptionsPopover\` from 'fumadocs-ui/layouts/docs/page', the Markdown URL of a page is \`${prefix}\${page.url}.md\`.`,
    );
  },
};
