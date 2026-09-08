import path from 'node:path';
import type { Feature } from '@/features';
import type { I18nInfo, ReactFramework } from '@/project';
import { addElements, getConfigObject, getProperty } from '@/codemod';
import { docs } from './docs';
import { reactRouterLangSegment, tanstackLangSegment } from './docs/templates';
import { extendNextProxy } from './llms';
import { docsSegment, reactFramework, registerReactRouterRoutes, url } from './utils';

type Engine = 'takumi' | 'next-og';

const image = `<DefaultImage title={page.data.title} description={page.data.description} site="My App" />`;

const imports = (engine: Engine) =>
  engine === 'takumi'
    ? `import { ImageResponse } from 'takumi-js/response';
import { generate as DefaultImage } from 'fumadocs-ui/og/takumi';`
    : `import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';`;

const options = (engine: Engine) =>
  engine === 'takumi'
    ? `{
      width: 1200,
      height: 630,
      format: 'webp',
    }`
    : `{
      width: 1200,
      height: 630,
    }`;

const ext = (engine: Engine) => (engine === 'takumi' ? 'webp' : 'png');

type Route = (
  engine: Engine,
  i18n: I18nInfo | null,
  docs: string,
) => [file: string, content: string];

const routes: Record<ReactFramework, Route> = {
  next: (engine, i18n, docs) => [
    `app/(docs)/${i18n ? '[lang]/' : ''}${url('og', docs)}/[...slug]/route.tsx`,
    `import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
${imports(engine)}

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: RouteContext<'${i18n ? '/[lang]' : ''}/${url('og', docs)}/[...slug]'>,
) {
  const { slug${i18n ? ', lang' : ''} } = await params;
  const page = source.getPage(slug.slice(0, -1)${i18n ? ', lang' : ''});
  if (!page) notFound();

  return new ImageResponse(
    ${image},
    ${options(engine)},
  );
}

export function generateStaticParams() {
  return source.generateParams().map((item) => ({
    ...item,
    slug: [...item.slug, 'image.${ext(engine)}'],
  }));
}
`,
  ],
  'react-router': (engine, i18n) => [
    'routes/og.docs.tsx',
    `import type { Route } from './+types/og.docs';
import { source } from '@/lib/source';
${imports(engine)}

export function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs.slice(0, -1)${i18n ? ', params.lang' : ''});
  if (!page) throw new Response(undefined, { status: 404 });

  return new ImageResponse(
    ${image},
    ${options(engine)},
  );
}
`,
  ],
  'tanstack-start': (engine, i18n, docs) => {
    const seg = tanstackLangSegment(i18n);
    return [
      `routes/${url(seg, 'og', docs)}/$.tsx`,
      `import { createFileRoute } from '@tanstack/react-router';
import { source } from '@/lib/source';
${imports(engine)}

export const Route = createFileRoute('/${url(seg, 'og', docs)}/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split('/') ?? [];
        const page = source.getPage(slugs.slice(0, -1)${i18n ? ', params.lang' : ''});
        if (!page) return new Response(undefined, { status: 404 });

        return new ImageResponse(
          ${image},
          ${options(engine).replaceAll('\n', '\n    ')},
        );
      },
    },
  },
});
`,
    ];
  },
  waku: (engine, i18n, docs) => [
    `pages/_api/${i18n ? '[lang]/' : ''}${url('og', docs)}/[...slugs]/image.${ext(engine)}.tsx`,
    `import { source } from '@/lib/source';
import type { ApiContext } from 'waku/router';
${imports(engine)}

export async function GET(
  _: Request,
  { params }: ApiContext<'${i18n ? '/[lang]' : ''}/${url('og', docs)}/[...slugs]/image.${ext(engine)}'>,
) {
  const page = source.getPage(params.slugs${i18n ? ', params.lang' : ''});
  if (!page) return new Response(undefined, { status: 404 });

  return new ImageResponse(
    ${image},
    ${options(engine)},
  );
}

export async function getConfig() {
  return {
    render: 'static' as const,
    staticPaths: source.generateParams().map((item) => ${i18n ? '[item.lang, ...item.slug]' : 'item.slug'}),
  } as const;
}
`,
  ],
};

export const og: Feature<{ engine: Engine }> = {
  id: 'og',
  title: 'OG Image',
  description: 'generate Open Graph images for docs pages',
  requires: [docs],
  options: {
    engine: {
      message: 'Choose an image engine',
      choices: [
        { value: 'takumi', label: 'Takumi', hint: 'outputs WebP, framework-agnostic' },
        { value: 'next-og', label: 'next/og', hint: 'Next.js built-in solution' },
      ],
    },
  },
  async apply(ctx, { engine }) {
    const { baseDir, configFile, i18n } = ctx.project;
    const framework = reactFramework(ctx.project);
    if (engine === 'next-og' && framework !== 'next')
      throw new Error('next/og is only available on Next.js');
    if (engine === 'takumi') ctx.addDependencies({ 'takumi-js': null });

    const docs = docsSegment(ctx);
    const [route, content] = routes[framework](engine, i18n, docs);
    await ctx.write(path.join(baseDir, route), content);

    if (framework === 'react-router') {
      await registerReactRouterRoutes(ctx, [
        { path: `${reactRouterLangSegment(i18n)}${url('og', docs)}/*`, entry: route },
      ]);
    }
    if (framework === 'next' && engine === 'takumi') {
      await ctx.source(path.join(baseDir, 'lib/source.ts'), (file) => {
        file.s.replaceAll('image.png', 'image.webp');
      });
      if (configFile) {
        await ctx.source(configFile, (file) => {
          const config = getConfigObject(file);
          if (config && !getProperty(config, 'serverExternalPackages'))
            addElements(file, config, ["serverExternalPackages: ['@takumi-rs/core']"]);
        });
      }
    }
    if (framework === 'next' && i18n) {
      await extendNextProxy(ctx, ['/og/:path*', '/:lang/og/:path*']);
    }

    ctx.note(
      `The image of a page is at \`${i18n ? '/<lang>' : ''}/${url('og', docs)}/<slugs>/image.${ext(engine)}\`, reference it in the page metadata (e.g. \`og:image\`).`,
    );
  },
};
