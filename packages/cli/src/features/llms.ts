import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import type { I18nInfo, ReactFramework } from '@/project';
import {
  type FormattedRoute,
  formatRoute,
  reactRouterTypes,
  routeModule,
  type RouteDescriptor,
} from '@/project/route';
import {
  addImport,
  addNextRewrites,
  addProxyMatcher,
  addTanstackPrerender,
  enableProcessedMarkdown,
} from '@/codemod';
import { docs, findNextProxy } from './docs';
import {
  addExport,
  addPageUrl,
  reactFramework,
  type SourceRef,
  sourceRef,
  registerReactRouterRoutes,
  requiresMarkdown,
  sharedRoute,
} from './utils';

/** runtime content sources expose raw Markdown as `page.data.content`, Fumadocs MDX processes it */
export const docsLlms = ({ dynamic, ref }: SourceRef) => `
export const docsLlms = llms(${ref}, {
  renderPage: ${dynamic ? '(page)' : 'async (page)'} => \`# \${page.data.title} (\${page.url})

\${${dynamic ? 'page.data.content' : "await page.data.getText('processed')"}}\`,
});`;

/** the Markdown URL of a page, `/llms.mdx/docs/<slugs>/content.md` */
export const markdownUrl = (i18n: boolean) => `
const getContentUrl = createGetUrl(docsContentRoute${i18n ? ', i18n' : ''});

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md'];

  return { segments, url: getContentUrl(segments, page.locale) };
}`;

/** TanStack Start serves Markdown with a `.md` suffix under the docs route */
export const tanstackMarkdownUrl = (i18n: boolean) => `
const getDocsUrl = createGetUrl(docsRoute${i18n ? ', i18n' : ''});

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  return { segments, url: getDocsUrl(segments, page.locale) };
}

/** @returns page slugs */
export function decodeMarkdownUrl(segments: string[]) {
  if (segments.length === 0) return [];

  const out = [...segments];
  out[out.length - 1] = out[out.length - 1].replace(/\\.md$/, '');
  if (out.length === 1 && out[0] === 'index') out.pop();
  return out;
}`;

const imports = `import { docsLlms } from '@/lib/source';`;
const pageImports = ({ ref }: SourceRef) => `import { docsLlms, ${ref} } from '@/lib/source';`;
const markdown = `new Response(await docsLlms.page(page), {
    headers: {
      'Content-Type': 'text/markdown',
    },
  })`;

interface Routes {
  index: FormattedRoute;
  full: FormattedRoute;
  markdown: FormattedRoute;
}

type Template = (route: FormattedRoute, i18n: boolean, src: SourceRef) => string;

/** the per-page Markdown route, the only one reading route params */
const markdownTemplates: Record<ReactFramework, Template> = {
  next: (route, i18n, src) => `${pageImports(src)}
import { notFound } from 'next/navigation';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'${route.path}'>) {
  const { slug${i18n ? ', lang' : ''} } = await params;
  // remove the appended "content.md", \`/docs/index.md\` is rewritten to the root page
  const slugs = slug?.slice(0, -1) ?? [];
  if (slugs.at(-1) === 'index') slugs.pop();
  const page = ${src.resolved}.getPage(slugs${i18n ? ', lang' : ''});
  if (!page) notFound();

  return ${markdown};
}

export ${src.dynamic ? 'async ' : ''}function generateStaticParams() {
  return ${src.resolved}.generateParams().map((item) => ({
    ...item,
    slug: [...item.slug, 'content.md'],
  }));
}
`,
  'react-router': (route, i18n, src) => `${reactRouterTypes(route)}
${pageImports(src)}

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  // remove the appended "content.md"
  slugs.pop();
  const page = ${src.resolved}.getPage(slugs${i18n ? ', params.lang' : ''});
  if (!page) return new Response('not found', { status: 404 });

  return ${markdown};
}
`,
  'tanstack-start': (
    route,
    i18n,
    src,
  ) => `import { createFileRoute, notFound } from '@tanstack/react-router';
import { decodeMarkdownUrl } from '@/lib/shared';
${pageImports(src)}

export const Route = createFileRoute('${route.path}')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = decodeMarkdownUrl(params._splat?.split('/') ?? []);
        const page = ${src.resolved}.getPage(slugs${i18n ? ', params.lang' : ''});
        if (!page) throw notFound();

        return ${markdown.replaceAll('\n  ', '\n        ')};
      },
    },
  },
});
`,
  waku: (route, i18n, src) => `${pageImports(src)}
import type { ApiContext } from 'waku/router';
import { unstable_notFound } from 'waku/router/server';

export async function GET(_: Request, { params }: ApiContext<'${route.path}'>) {
  const page = ${src.resolved}.getPage(params.slug${i18n ? ', params.lang' : ''});
  if (!page) unstable_notFound();

  return ${markdown};
}

export async function getConfig() {
  return {
    render: 'static' as const,
    staticPaths: ${src.resolved}.generateParams().map((item) => ${i18n ? '[item.lang, ...item.slug]' : 'item.slug'}),
  } as const;
}
`,
};

export function templates(
  framework: ReactFramework,
  routes: Routes,
  i18n: boolean,
  src: SourceRef,
): [route: FormattedRoute, content: string][] {
  const index = (body: string) => ({ imports, body, revalidate: true, static: true });

  return [
    [
      routes.index,
      routeModule(framework, routes.index, index('new Response(await docsLlms.index())')),
    ],
    [
      routes.full,
      routeModule(framework, routes.full, index('new Response(await docsLlms.full())')),
    ],
    [routes.markdown, markdownTemplates[framework](routes.markdown, i18n, src)],
  ];
}

export function llmsRoutes(
  framework: ReactFramework,
  i18n: I18nInfo | null,
  docsRoute: string,
  contentRoute: string,
): Routes {
  const format = (route: RouteDescriptor) => formatRoute(route, framework, i18n);
  return {
    index: format({ segments: ['llms.txt'] }),
    full: format({ segments: ['llms-full.txt'] }),
    markdown: format(
      framework === 'tanstack-start'
        ? { segments: [docsRoute, '{$}.md'], locale: true }
        : {
            segments: [
              contentRoute,
              { param: 'slug', catchAll: true, optional: true, suffix: 'content.md' },
            ],
            locale: true,
          },
    ),
  };
}

export const llms: Feature = {
  id: 'llms',
  title: 'LLM Routes',
  description: 'serve docs as Markdown for LLMs: llms.txt, llms-full.txt and per-page Markdown',
  requires: [docs],
  supports: requiresMarkdown,
  async apply(ctx) {
    const { baseDir, i18n, source, configFile } = ctx.project;
    const framework = reactFramework(ctx.project);
    const sourceFile = path.join(baseDir, 'lib/source.ts');
    const src = sourceRef(ctx.project.source.dynamic);
    // runtime content sources already give raw Markdown
    if (source.collections) {
      await ctx.source(source.collections, (file) => {
        if (!enableProcessedMarkdown(file))
          throw new Error(`cannot find \`defineDocs()\` in ${source.collections}`);
      });
    }
    if (await addExport(ctx, sourceFile, 'docsLlms', docsLlms(src))) {
      await ctx.source(sourceFile, (file) =>
        addImport(file, { from: 'fumadocs-core/source', named: ['llms'] }),
      );
    }

    const docsRoute = source.baseUrl.replace(/\/$/, '');
    let contentRoute = `/llms.mdx${docsRoute}`;
    if (framework === 'tanstack-start') {
      await sharedRoute(ctx, 'docsRoute', source.baseUrl);
      await addPageUrl(ctx, 'getPageMarkdownUrl', tanstackMarkdownUrl(i18n !== null));
    } else {
      contentRoute = await sharedRoute(ctx, 'docsContentRoute', contentRoute);
      await addPageUrl(ctx, 'getPageMarkdownUrl', markdownUrl(i18n !== null));
    }
    const routes = llmsRoutes(framework, i18n, docsRoute, contentRoute);
    for (const [route, content] of templates(framework, routes, i18n !== null, src))
      await ctx.write(path.join(baseDir, route.file), content);

    if (framework === 'react-router') {
      await registerReactRouterRoutes(ctx, [routes.index, routes.full, routes.markdown]);
    } else if (framework === 'tanstack-start' && ctx.project.static && configFile) {
      // SPA mode only serves prerendered routes
      await ctx.source(configFile, (file) =>
        addTanstackPrerender(file, [routes.index.path, routes.full.path]),
      );
    } else if (framework === 'next') {
      if (i18n) await extendNextProxy(ctx, routes.markdown);
      await configureMarkdownUrl(ctx, docsRoute, routes.markdown);
    }
    if (ctx.project.static && framework !== 'next') {
      ctx.note(
        'Per-page Markdown routes are dynamic, add the pages to your prerender config to serve them statically.',
      );
    }
    if (framework === 'react-router' || framework === 'waku') {
      ctx.note(
        'To serve pages with a `.md` suffix, rewrite `/docs/*.md` to the `llms.mdx` route in a middleware, see https://fumadocs.dev/docs/integrations/llms#md-extension.',
      );
    }
    ctx.note(
      "Add page actions to your docs page with `MarkdownCopyButton` and `ViewOptionsPopover` from 'fumadocs-ui/layouts/docs/page', the Markdown URL of a page is `getPageMarkdownUrl(page).url` from '@/lib/shared'.",
    );
  },
};

/** `/docs/*.md` serves the Markdown of a page, like TanStack Start's `.md` route */
export const markdownRewrite = (docsRoute: string, markdown: FormattedRoute, i18n: boolean) => ({
  source: `${i18n ? '/:lang' : ''}${docsRoute}/:slug*.md`,
  destination: `${markdown.pattern}/content.md`,
});

async function configureMarkdownUrl(
  ctx: FeatureContext,
  docsRoute: string,
  markdown: FormattedRoute,
) {
  const { configFile, i18n } = ctx.project;
  const rewrite = markdownRewrite(docsRoute, markdown, i18n !== null);
  const edited =
    configFile !== undefined &&
    (await ctx
      .source(configFile, (file) => {
        if (file.code.includes('llms.mdx')) return;
        if (!addNextRewrites(file, [rewrite])) throw new Error('cannot add rewrites');
      })
      .catch(() => false));

  if (!edited) {
    ctx.note(
      `Rewrite \`${rewrite.source}\` to \`${rewrite.destination}\` in your Next.js config to serve pages with a \`.md\` suffix.`,
    );
  }
}

/** routes under `[lang]` need the i18n middleware to resolve the locale */
export async function extendNextProxy(ctx: FeatureContext, route: FormattedRoute) {
  const patterns = [route.pattern.replace('/:lang', ''), route.pattern];
  const proxy = await findNextProxy(ctx.project);
  const edited =
    proxy !== undefined &&
    (await ctx
      .source(proxy, (file) => {
        if (!addProxyMatcher(file, patterns)) throw new Error('cannot find the matcher');
      })
      .catch(() => false));
  if (!edited)
    ctx.note(
      `Add ${patterns.map((p) => `\`${p}\``).join(', ')} to the matcher of your i18n middleware.`,
    );
}
