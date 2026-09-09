import path from 'node:path';
import type { Feature } from '@/features';
import type { ReactFramework } from '@/project';
import { type FormattedRoute, formatRoute, reactRouterTypes } from '@/project/route';
import { addElements, getConfigObject, getProperty } from '@/codemod';
import { docs } from './docs';
import { extendNextProxy } from './llms';
import {
  addPageUrl,
  reactFramework,
  registerReactRouterRoutes,
  sharedRoute,
  type SourceRef,
  sourceRef,
} from './utils';

type Engine = 'takumi' | 'next-og';

/** the image URL of a page, `/og/docs/<slugs>/image.png` */
const imageUrl = (ext: string) => `
export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.${ext}'];

  return { segments, url: getPageUrl(docsImageRoute, segments, page.locale) };
}`;

const imports = (engine: Engine) =>
  `import { generateOGImage } from 'fumadocs-ui/og${engine === 'takumi' ? '/takumi' : ''}';`;

const image = (engine: Engine) => `generateOGImage({
    title: page.data.title,
    description: page.data.description,
    site: 'My App',${engine === 'takumi' ? "\n    format: 'webp'," : ''}
  })`;

const ext = (engine: Engine) => (engine === 'takumi' ? 'webp' : 'png');

type Template = (route: FormattedRoute, engine: Engine, i18n: boolean, src: SourceRef) => string;

const templates: Record<ReactFramework, Template> = {
  next: (route, engine, i18n, src) => `import { ${src.ref} } from '@/lib/source';
import { notFound } from 'next/navigation';
${imports(engine)}

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'${route.path}'>) {
  const { slug${i18n ? ', lang' : ''} } = await params;
  const page = ${src.resolved}.getPage(slug.slice(0, -1)${i18n ? ', lang' : ''});
  if (!page) notFound();

  return ${image(engine)};
}

export ${src.dynamic ? 'async ' : ''}function generateStaticParams() {
  return ${src.resolved}.generateParams().map((item) => ({
    ...item,
    slug: [...item.slug, 'image.${ext(engine)}'],
  }));
}
`,
  'react-router': (route, engine, i18n, src) => `${reactRouterTypes(route)}
import { ${src.ref} } from '@/lib/source';
${imports(engine)}

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = ${src.resolved}.getPage(slugs.slice(0, -1)${i18n ? ', params.lang' : ''});
  if (!page) throw new Response(undefined, { status: 404 });

  return ${image(engine)};
}
`,
  'tanstack-start': (
    route,
    engine,
    i18n,
    src,
  ) => `import { createFileRoute } from '@tanstack/react-router';
import { ${src.ref} } from '@/lib/source';
${imports(engine)}

export const Route = createFileRoute('${route.path}')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split('/') ?? [];
        const page = ${src.resolved}.getPage(slugs.slice(0, -1)${i18n ? ', params.lang' : ''});
        if (!page) return new Response(undefined, { status: 404 });

        return ${image(engine).replaceAll('\n  ', '\n        ')};
      },
    },
  },
});
`,
  waku: (route, engine, i18n, src) => `import { ${src.ref} } from '@/lib/source';
import type { ApiContext } from 'waku/router';
${imports(engine)}

export async function GET(_: Request, { params }: ApiContext<'${route.path}'>) {
  const page = ${src.resolved}.getPage(params.slug${i18n ? ', params.lang' : ''});
  if (!page) return new Response(undefined, { status: 404 });

  return ${image(engine)};
}

export async function getConfig() {
  return {
    render: 'static' as const,
    staticPaths: ${src.resolved}.generateParams().map((item) => ${i18n ? '[item.lang, ...item.slug]' : 'item.slug'}),
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

    const shared = path.join(baseDir, 'lib/shared.ts');
    const imageRoute = await sharedRoute(
      ctx,
      'docsImageRoute',
      `/og${source.baseUrl.replace(/\/$/, '')}`,
    );
    if (!(await addPageUrl(ctx, 'getPageImageUrl', imageUrl(ext(engine)))) && engine === 'takumi') {
      await ctx.source(shared, (file) => {
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
      templates[framework](route, engine, i18n !== null, sourceRef(ctx.project.source.dynamic)),
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
      "The image URL of a page is `getPageImageUrl(page).url` from '@/lib/shared', reference it in the page metadata (e.g. `og:image`).",
    );
  },
};
