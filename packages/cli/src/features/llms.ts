import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import type { I18nInfo, ReactFramework } from '@/project';
import { type FormattedRoute, formatRoute, type RouteDescriptor } from '@/project/route';
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
  reactFramework,
  reactRouterTypes,
  registerReactRouterRoutes,
  requiresMdx,
  sharedRoute,
} from './utils';

export const getLLMText = `
export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return \`# \${page.data.title} (\${page.url})

\${processed}\`;
}`;

/** the Markdown URL of a page, `/llms.mdx/docs/<slugs>/content.md` */
export const markdownUrl = `
export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: '/' + [page.locale, ...docsContentRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}`;

/** TanStack Start serves Markdown with a `.md` suffix under the docs route */
export const tanstackMarkdownUrl = `
export function encodeMarkdownUrl(slugs: string[], locale?: string) {
  const segments = [...slugs];
  if (segments.length === 0) {
    segments.push('index.md');
  } else {
    segments[segments.length - 1] += '.md';
  }

  return '/' + [locale, ...docsRoute.split('/'), ...segments].filter(Boolean).join('/');
}

/** @returns page slugs */
export function decodeMarkdownUrl(segments: string[]) {
  if (segments.length === 0) return [];

  const out = [...segments];
  out[out.length - 1] = out[out.length - 1].replace(/\\.md$/, '');
  if (out.length === 1 && out[0] === 'index') out.pop();
  return out;
}`;

const index = `import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';`;
const full = `import { getLLMText, source } from '@/lib/source';`;
const fullBody = `const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\\n\\n'));`;
const markdown = `new Response(await getLLMText(page), {
    headers: {
      'Content-Type': 'text/markdown',
    },
  })`;

interface Routes {
  index: FormattedRoute;
  full: FormattedRoute;
  markdown: FormattedRoute;
}

type Template = (routes: Routes, i18n: boolean) => [route: FormattedRoute, content: string][];

export const templates: Record<ReactFramework, Template> = {
  next: (routes, i18n) => [
    [
      routes.index,
      `${index}

export const revalidate = false;

export function GET() {
  return new Response(llms(source).index());
}
`,
    ],
    [
      routes.full,
      `${full}

export const revalidate = false;

export async function GET() {
  ${fullBody}
}
`,
    ],
    [
      routes.markdown,
      `${full}
import { notFound } from 'next/navigation';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'${routes.markdown.path}'>) {
  const { slug${i18n ? ', lang' : ''} } = await params;
  // remove the appended "content.md", \`/docs/index.md\` is rewritten to the root page
  const slugs = slug?.slice(0, -1) ?? [];
  if (slugs.at(-1) === 'index') slugs.pop();
  const page = source.getPage(slugs${i18n ? ', lang' : ''});
  if (!page) notFound();

  return ${markdown};
}

export function generateStaticParams() {
  return source.generateParams().map((item) => ({
    ...item,
    slug: [...item.slug, 'content.md'],
  }));
}
`,
    ],
  ],
  'react-router': (routes, i18n) => [
    [
      routes.index,
      `${index}

export function loader() {
  return new Response(llms(source).index());
}
`,
    ],
    [
      routes.full,
      `${full}

export async function loader() {
  ${fullBody}
}
`,
    ],
    [
      routes.markdown,
      `${reactRouterTypes(routes.markdown)}
${full}

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  // remove the appended "content.md"
  slugs.pop();
  const page = source.getPage(slugs${i18n ? ', params.lang' : ''});
  if (!page) return new Response('not found', { status: 404 });

  return ${markdown};
}
`,
    ],
  ],
  'tanstack-start': (routes, i18n) => [
    [
      routes.index,
      `import { createFileRoute } from '@tanstack/react-router';
${index}

export const Route = createFileRoute('${routes.index.path}')({
  server: {
    handlers: {
      GET() {
        return new Response(llms(source).index());
      },
    },
  },
});
`,
    ],
    [
      routes.full,
      `import { createFileRoute } from '@tanstack/react-router';
${full}

export const Route = createFileRoute('${routes.full.path}')({
  server: {
    handlers: {
      GET: async () => {
        ${fullBody.replaceAll('\n  ', '\n        ')}
      },
    },
  },
});
`,
    ],
    [
      routes.markdown,
      `import { createFileRoute, notFound } from '@tanstack/react-router';
import { decodeMarkdownUrl } from '@/lib/shared';
${full}

export const Route = createFileRoute('${routes.markdown.path}')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = decodeMarkdownUrl(params._splat?.split('/') ?? []);
        const page = source.getPage(slugs${i18n ? ', params.lang' : ''});
        if (!page) throw notFound();

        return ${markdown.replaceAll('\n  ', '\n        ')};
      },
    },
  },
});
`,
    ],
  ],
  waku: (routes, i18n) => [
    [
      routes.index,
      `${index}

export function GET() {
  return new Response(llms(source).index());
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
`,
    ],
    [
      routes.full,
      `${full}

export async function GET() {
  ${fullBody}
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
`,
    ],
    [
      routes.markdown,
      `${full}
import type { ApiContext } from 'waku/router';
import { unstable_notFound } from 'waku/router/server';

export async function GET(_: Request, { params }: ApiContext<'${routes.markdown.path}'>) {
  const page = source.getPage(params.slug${i18n ? ', params.lang' : ''});
  if (!page) unstable_notFound();

  return ${markdown};
}

export async function getConfig() {
  return {
    render: 'static' as const,
    staticPaths: source.generateParams().map((item) => ${i18n ? '[item.lang, ...item.slug]' : 'item.slug'}),
  } as const;
}
`,
    ],
  ],
};

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
  supports: requiresMdx,
  async apply(ctx) {
    const { baseDir, i18n, source, configFile } = ctx.project;
    const framework = reactFramework(ctx.project);
    const sourceFile = path.join(baseDir, 'lib/source.ts');
    const shared = path.join(baseDir, 'lib/shared.ts');
    await ctx.source(source.collections!, (file) => {
      if (!enableProcessedMarkdown(file))
        throw new Error(`cannot find \`defineDocs()\` in ${source.collections}`);
    });
    await addExport(ctx, sourceFile, 'getLLMText', getLLMText);

    const docsRoute = source.baseUrl.replace(/\/$/, '');
    let contentRoute = `/llms.mdx${docsRoute}`;
    let helper: string;
    if (framework === 'tanstack-start') {
      await sharedRoute(ctx, 'docsRoute', source.baseUrl);
      await addExport(ctx, shared, 'encodeMarkdownUrl', tanstackMarkdownUrl);
      helper = "`encodeMarkdownUrl(page.slugs, page.locale)` from '@/lib/shared'";
    } else {
      contentRoute = await sharedRoute(ctx, 'docsContentRoute', contentRoute);
      if (await addExport(ctx, sourceFile, 'getPageMarkdownUrl', markdownUrl)) {
        await ctx.source(sourceFile, (file) =>
          addImport(file, { from: './shared', named: ['docsContentRoute'] }),
        );
      }
      helper = "`getPageMarkdownUrl(page).url` from '@/lib/source'";
    }
    const routes = llmsRoutes(framework, i18n, docsRoute, contentRoute);
    for (const [route, content] of templates[framework](routes, i18n !== null))
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
      `Add page actions to your docs page with \`MarkdownCopyButton\` and \`ViewOptionsPopover\` from 'fumadocs-ui/layouts/docs/page', the Markdown URL of a page is ${helper}.`,
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
