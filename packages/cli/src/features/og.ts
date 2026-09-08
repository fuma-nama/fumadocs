import path from 'node:path';
import type { Feature } from '@/features';
import type { ReactFramework } from '@/project';
import { type FormattedRoute, formatRoute } from '@/project/route';
import { addElements, addImport, getConfigObject, getProperty } from '@/codemod';
import { docs } from './docs';
import { extendNextProxy } from './llms';
import {
  addExport,
  reactFramework,
  reactRouterTypes,
  registerReactRouterRoutes,
  sharedRoute,
} from './utils';

type Engine = 'takumi' | 'next-og';

/** the image URL of a page, `/og/docs/<slugs>/image.png` */
const imageUrl = (ext: string) => `
export function getPageImageUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.${ext}'];

  return {
    segments,
    url: '/' + [page.locale, ...docsImageRoute.split('/'), ...segments].filter(Boolean).join('/'),
  };
}`;

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

type Template = (route: FormattedRoute, engine: Engine, i18n: boolean) => string;

const templates: Record<ReactFramework, Template> = {
  next: (route, engine, i18n) => `import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
${imports(engine)}

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'${route.path}'>) {
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
  'react-router': (route, engine, i18n) => `${reactRouterTypes(route)}
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
  'tanstack-start': (
    route,
    engine,
    i18n,
  ) => `import { createFileRoute } from '@tanstack/react-router';
import { source } from '@/lib/source';
${imports(engine)}

export const Route = createFileRoute('${route.path}')({
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
  waku: (route, engine, i18n) => `import { source } from '@/lib/source';
import type { ApiContext } from 'waku/router';
${imports(engine)}

export async function GET(_: Request, { params }: ApiContext<'${route.path}'>) {
  const page = source.getPage(params.slug${i18n ? ', params.lang' : ''});
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
    const { baseDir, configFile, i18n, source } = ctx.project;
    const framework = reactFramework(ctx.project);
    if (engine === 'next-og' && framework !== 'next')
      throw new Error('next/og is only available on Next.js');
    if (engine === 'takumi') ctx.addDependencies({ 'takumi-js': null });

    const sourceFile = path.join(baseDir, 'lib/source.ts');
    const imageRoute = await sharedRoute(
      ctx,
      'docsImageRoute',
      `/og${source.baseUrl.replace(/\/$/, '')}`,
    );
    if (await addExport(ctx, sourceFile, 'getPageImageUrl', imageUrl(ext(engine)))) {
      await ctx.source(sourceFile, (file) =>
        addImport(file, { from: './shared', named: ['docsImageRoute'] }),
      );
    } else if (engine === 'takumi') {
      await ctx.source(sourceFile, (file) => {
        file.s.replaceAll('image.png', 'image.webp');
      });
    }

    const route = formatRoute(
      {
        segments: [imageRoute, { param: 'slug', catchAll: true, suffix: `image.${ext(engine)}` }],
        locale: true,
      },
      framework,
      i18n,
      'tsx',
    );
    await ctx.write(
      path.join(baseDir, route.file),
      templates[framework](route, engine, i18n !== null),
    );

    if (framework === 'react-router') await registerReactRouterRoutes(ctx, [route]);
    if (framework === 'next' && engine === 'takumi' && configFile) {
      await ctx.source(configFile, (file) => {
        const config = getConfigObject(file);
        if (config && !getProperty(config, 'serverExternalPackages'))
          addElements(file, config, ["serverExternalPackages: ['@takumi-rs/core']"]);
      });
    }
    if (framework === 'next' && i18n) await extendNextProxy(ctx, route);

    ctx.note(
      "The image URL of a page is `getPageImageUrl(page).url` from '@/lib/source', reference it in the page metadata (e.g. `og:image`).",
    );
  },
};
