import path from 'node:path';
import type { Feature } from '@/features';
import type { I18nInfo, ReactFramework } from '@/project';
import {
  addNextRewrites,
  addProxyMatcher,
  addReactRouterRoute,
  enableProcessedMarkdown,
} from '@/codemod';
import { docs, findNextProxy } from './docs';
import { reactRouterLangSegment, tanstackLangSegment } from './docs/templates';
import { reactFramework } from './utils';

const getLLMText = `
export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return \`# \${page.data.title} (\${page.url})

\${processed}\`;
}
`;

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

type Routes = (i18n: I18nInfo | null) => [file: string, content: string][];

const routes: Record<ReactFramework, Routes> = {
  next: (i18n) => [
    [
      'app/llms.txt/route.ts',
      `${index}

export const revalidate = false;

export function GET() {
  return new Response(llms(source).index());
}
`,
    ],
    [
      'app/llms-full.txt/route.ts',
      `${full}

export const revalidate = false;

export async function GET() {
  ${fullBody}
}
`,
    ],
    [
      // the per-page route is under the docs route group, with the `[lang]` segment
      `app/(docs)/${i18n ? '[lang]/' : ''}llms.mdx/docs/[[...slug]]/route.ts`,
      `${full}
import { notFound } from 'next/navigation';

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<'${i18n ? '/[lang]' : ''}/llms.mdx/docs/[[...slug]]'>,
) {
  const { slug${i18n ? ', lang' : ''} } = await params;
  const slugs = slug?.slice(0, -1) ?? [];
  // \`/docs/index.md\` is rewritten to the root page
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
  'react-router': (i18n) => [
    [
      'llms/index.ts',
      `${index}

export function loader() {
  return new Response(llms(source).index());
}
`,
    ],
    [
      'llms/full.ts',
      `${full}

export async function loader() {
  ${fullBody}
}
`,
    ],
    [
      'llms/mdx.ts',
      `import type { Route } from './+types/mdx';
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
  'tanstack-start': (i18n) => {
    const seg = tanstackLangSegment(i18n);
    return [
      [
        'routes/llms[.]txt.ts',
        `import { createFileRoute } from '@tanstack/react-router';
${index}

export const Route = createFileRoute('/llms.txt')({
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
        'routes/llms-full[.]txt.ts',
        `import { createFileRoute } from '@tanstack/react-router';
${full}

export const Route = createFileRoute('/llms-full.txt')({
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
        `routes/${seg}docs/{$}[.]md.ts`,
        `import { createFileRoute, notFound } from '@tanstack/react-router';
${full}

export const Route = createFileRoute('/${seg}docs/{$}.md')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split('/') ?? [];
        // remove the ".md" suffix
        slugs[slugs.length - 1] = slugs[slugs.length - 1].replace(/\\.md$/, '');
        if (slugs.length === 1 && slugs[0] === 'index') slugs.pop();
        const page = source.getPage(slugs${i18n ? ', params.lang' : ''});
        if (!page) throw notFound();

        return ${markdown.replaceAll('\n  ', '\n        ')};
      },
    },
  },
});
`,
      ],
    ];
  },
  waku: (i18n) => [
    [
      'pages/_api/llms.txt.ts',
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
      'pages/_api/llms-full.txt.ts',
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
      `pages/_api/${i18n ? '[lang]/' : ''}llms.mdx/docs/[...slugs]/content.md.ts`,
      `${full}
import type { ApiContext } from 'waku/router';
import { unstable_notFound } from 'waku/router/server';

export async function GET(
  _: Request,
  { params }: ApiContext<'${i18n ? '/[lang]' : ''}/llms.mdx/docs/[...slugs]/content.md'>,
) {
  const page = source.getPage(params.slugs${i18n ? ', params.lang' : ''});
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

export const llms: Feature = {
  id: 'llms',
  title: 'LLM Routes',
  description: 'serve docs as Markdown for LLMs: llms.txt, llms-full.txt and per-page Markdown',
  requires: [docs],
  async apply(ctx) {
    const { baseDir, i18n } = ctx.project;
    const framework = reactFramework(ctx.project);
    const sourceFile = path.join(baseDir, 'lib/source.ts');
    const edited = await ctx.source(sourceFile, (file) => {
      if (!enableProcessedMarkdown(file))
        throw new Error(`cannot find \`defineDocs()\` in ${sourceFile}`);
    });
    if (!edited) throw new Error(`${sourceFile} not found`);
    await ctx.append(sourceFile, [getLLMText]);

    for (const [file, content] of routes[framework](i18n))
      await ctx.write(path.join(baseDir, file), content);

    if (framework === 'react-router') {
      await ctx.source(path.join(baseDir, 'routes.ts'), (file) => {
        if (file.code.includes('llms/index.ts')) return;
        addReactRouterRoute(file, [
          { path: 'llms.txt', entry: 'llms/index.ts' },
          { path: 'llms-full.txt', entry: 'llms/full.ts' },
          { path: `${reactRouterLangSegment(i18n)}llms.mdx/docs/*`, entry: 'llms/mdx.ts' },
        ]);
      });
    } else if (framework === 'next') {
      if (i18n) await extendNextProxy(ctx, ['/llms.mdx/:path*', '/:lang/llms.mdx/:path*']);
      await configureMarkdownUrl(ctx, i18n !== null);
    }

    const markdownUrl =
      framework === 'react-router' || framework === 'waku'
        ? '`/llms.mdx${page.url}/content.md`'
        : '`${page.url}.md`';
    if (framework === 'react-router' || framework === 'waku') {
      ctx.note(
        'To serve pages with a `.md` suffix, rewrite `/docs/*.md` to the `llms.mdx` route in a middleware, see https://fumadocs.dev/docs/integrations/llms#md-extension.',
      );
    }
    ctx.note(
      `Add page actions to your docs page with \`MarkdownCopyButton\` and \`ViewOptionsPopover\` from 'fumadocs-ui/layouts/docs/page', the Markdown URL of a page is ${markdownUrl}.`,
    );
  },
};

/** `/docs/*.md` serves the Markdown of a page, like TanStack Start's `.md` route */
async function configureMarkdownUrl(ctx: Parameters<Feature['apply']>[0], i18n: boolean) {
  const { configFile } = ctx.project;
  const lang = i18n ? '/:lang' : '';
  const edited =
    configFile !== undefined &&
    (await ctx
      .source(configFile, (file) => {
        if (file.code.includes('llms.mdx')) return;
        if (
          !addNextRewrites(file, [
            {
              source: `${lang}/docs/:path*.md`,
              destination: `${lang}/llms.mdx/docs/:path*/content.md`,
            },
          ])
        )
          throw new Error('cannot add rewrites');
      })
      .catch(() => false));

  if (!edited) {
    ctx.note(
      `Rewrite \`${lang}/docs/:path*.md\` to \`${lang}/llms.mdx/docs/:path*/content.md\` in your Next.js config to serve pages with a \`.md\` suffix.`,
    );
  }
}

/** routes under `[lang]` need the i18n middleware to resolve the locale */
export async function extendNextProxy(ctx: Parameters<Feature['apply']>[0], patterns: string[]) {
  const proxy = await findNextProxy(ctx.project);
  const edited =
    proxy !== undefined &&
    (await ctx.source(proxy, (file) => {
      addProxyMatcher(file, patterns);
    }));
  if (!edited)
    ctx.note(
      `Add ${patterns.map((p) => `\`${p}\``).join(', ')} to the matcher of your i18n middleware.`,
    );
}
