import path from 'node:path';
import type { Feature } from '@/features';
import type { ReactFramework } from '@/project';
import { type FormattedRoute, formatRoute } from '@/project/route';
import { addReactRouterPrerenderArray, enableProcessedMarkdown } from '@/codemod';
import { docs } from './docs';
import { reactFramework, reactRouterTypes, registerReactRouterRoutes, requiresMdx } from './utils';

const handler = `import { source } from '@/lib/source';
import { exportEpub } from 'fumadocs-epub';

async function handle(request: Request): Promise<Response> {
  // Require EXPORT_SECRET to prevent unauthenticated abuse. Pass via Authorization: Bearer <secret>
  const secret = process.env.EXPORT_SECRET;
  if (!secret) {
    return new Response('EXPORT_SECRET is not configured.', { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\\s+/i, '') ?? '';
  if (token !== secret) {
    return new Response('Unauthorized', { status: authHeader ? 403 : 401 });
  }

  const buffer = await exportEpub({
    source,
    title: 'Documentation',
    author: 'Your Team',
    description: 'Exported documentation',
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/epub+zip',
      'Content-Disposition': 'attachment; filename="docs.epub"',
    },
  });
}
`;

const templates: Record<ReactFramework, (route: FormattedRoute) => string> = {
  next: () => `${handler}
export const revalidate = false;

export const GET = handle;
`,
  'react-router': (route) => `${reactRouterTypes(route)}
${handler}
export function loader({ request }: Route.LoaderArgs) {
  return handle(request);
}
`,
  'tanstack-start': (route) => `import { createFileRoute } from '@tanstack/react-router';
${handler}
export const Route = createFileRoute('${route.path}')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
    },
  },
});
`,
  waku: () => `${handler}
export const GET = handle;
`,
};

export const epub: Feature = {
  id: 'epub',
  title: 'EPUB Export',
  description: 'a route to export docs as an EPUB file, protected by EXPORT_SECRET',
  requires: [docs],
  supports: (project) =>
    project.static ? 'the export route needs a server at runtime' : requiresMdx(project),
  async apply(ctx) {
    const { baseDir, source } = ctx.project;
    const framework = reactFramework(ctx.project);
    ctx.addDependencies({ 'fumadocs-epub': null });

    await ctx.source(source.collections!, (file) => {
      if (!enableProcessedMarkdown(file))
        throw new Error(`cannot find \`defineDocs()\` in ${source.collections}`);
    });

    const route = formatRoute({ segments: ['export/epub'] }, framework, null);
    await ctx.write(path.join(baseDir, route.file), templates[framework](route));
    if (framework === 'react-router') {
      await registerReactRouterRoutes(ctx, [route]);
      // the route needs a secret at runtime
      await ctx.source('react-router.config.ts', (file) => {
        addReactRouterPrerenderArray(file, 'excluded', [`/${route.path}`]);
      });
    }

    ctx.env('EXPORT_SECRET', '');
    ctx.note(
      'Set EXPORT_SECRET in `.env.local`, then export with `fumadocs export epub` after a production build.',
    );
  },
};
