import path from 'node:path';
import type { Feature } from '@/features';
import type { ReactFramework } from '@/project';
import { addElements, addReactRouterRoute, getConfigObject, getProperty } from '@/codemod';
import { docs } from './docs';
import { reactFramework } from './utils';

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

const routes: Record<ReactFramework, (engine: Engine) => [file: string, content: string]> = {
  next: (engine) => [
    'app/og/docs/[...slug]/route.tsx',
    `import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
${imports(engine)}

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    ${image},
    ${options(engine)},
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: [...page.slugs, 'image.${ext(engine)}'],
  }));
}
`,
  ],
  'react-router': (engine) => [
    'routes/og.docs.tsx',
    `import type { Route } from './+types/og.docs';
import { source } from '@/lib/source';
${imports(engine)}

export function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  const page = source.getPage(slugs.slice(0, -1));
  if (!page) throw new Response(undefined, { status: 404 });

  return new ImageResponse(
    ${image},
    ${options(engine)},
  );
}
`,
  ],
  'tanstack-start': (engine) => [
    'routes/og/docs/$.tsx',
    `import { createFileRoute } from '@tanstack/react-router';
import { source } from '@/lib/source';
${imports(engine)}

export const Route = createFileRoute('/og/docs/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split('/') ?? [];
        const page = source.getPage(slugs.slice(0, -1));
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
  ],
  waku: (engine) => [
    `pages/_api/og/docs/[...slugs]/image.${ext(engine)}.tsx`,
    `import { source } from '@/lib/source';
import type { ApiContext } from 'waku/router';
${imports(engine)}

export async function GET(
  _: Request,
  { params }: ApiContext<'/og/docs/[...slugs]/image.${ext(engine)}'>,
) {
  const page = source.getPage(params.slugs);
  if (!page) return new Response(undefined, { status: 404 });

  return new ImageResponse(
    ${image},
    ${options(engine)},
  );
}

export async function getConfig() {
  return {
    render: 'static' as const,
    staticPaths: source.generateParams().map((item) => item.slug),
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
    const { baseDir, configFile } = ctx.project;
    const framework = reactFramework(ctx.project);
    if (engine === 'next-og' && framework !== 'next')
      throw new Error('next/og is only available on Next.js');
    if (engine === 'takumi') ctx.addDependencies({ 'takumi-js': null });

    const [route, content] = routes[framework](engine);
    await ctx.write(path.join(baseDir, route), content);

    if (framework === 'react-router') {
      await ctx.source(path.join(baseDir, 'routes.ts'), (file) => {
        if (file.code.includes(route)) return;
        addReactRouterRoute(file, [{ path: 'og/docs/*', entry: route }]);
      });
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

    ctx.note(
      `The image of a page is at \`/og/docs/<slugs>/image.${ext(engine)}\`, reference it in the page metadata (e.g. \`og:image\`).`,
    );
  },
};
