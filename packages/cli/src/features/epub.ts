import path from 'node:path';
import type { Feature } from '@/features';
import type { ReactFramework } from '@/project';
import { type FormattedRoute, formatRoute } from '@/project/route';
import { addReactRouterPrerenderArray, enableProcessedMarkdown } from '@/codemod';
import { docs } from './docs';
import {
  reactFramework,
  reactRouterTypes,
  registerReactRouterRoutes,
  requiresMarkdown,
  type SourceRef,
  sourceRef,
} from './utils';

const api = ({ dynamic, ref }: SourceRef) => `import { ${ref} } from '@/lib/source';
import { createEpubExportAPI } from 'fumadocs-epub';

const api = createEpubExportAPI({
  source: ${ref},${dynamic ? '\n  getMarkdown: (page) => page.data.content,' : ''}
  title: 'Documentation',
  author: 'Your Team',
  description: 'Exported documentation',
  // guards the route, requests must send \`Authorization: Bearer <secret>\`
  secret: process.env.EXPORT_SECRET,
});
`;

const templates: Record<ReactFramework, (route: FormattedRoute, src: SourceRef) => string> = {
  next: (_, src) => `${api(src)}
export const revalidate = false;

export const GET = api.GET;
`,
  'react-router': (route, src) => `${reactRouterTypes(route)}
${api(src)}
export function loader({ request }: Route.LoaderArgs) {
  return api.GET(request);
}
`,
  'tanstack-start': (route, src) => `import { createFileRoute } from '@tanstack/react-router';
${api(src)}
export const Route = createFileRoute('${route.path}')({
  server: {
    handlers: {
      GET: ({ request }) => api.GET(request),
    },
  },
});
`,
  waku: (_, src) => `${api(src)}
export const GET = api.GET;
`,
};

export const epub: Feature = {
  id: 'epub',
  title: 'EPUB Export',
  description: 'a route to export docs as an EPUB file, protected by EXPORT_SECRET',
  requires: [docs],
  supports: (project) =>
    project.static ? 'the export route needs a server at runtime' : requiresMarkdown(project),
  async apply(ctx) {
    const { baseDir, source } = ctx.project;
    const framework = reactFramework(ctx.project);
    ctx.addDependencies({ 'fumadocs-epub': null });

    if (source.collections) {
      await ctx.source(source.collections, (file) => {
        if (!enableProcessedMarkdown(file))
          throw new Error(`cannot find \`defineDocs()\` in ${source.collections}`);
      });
    }

    const route = formatRoute({ segments: ['export/epub'] }, framework, null);
    await ctx.write(
      path.join(baseDir, route.file),
      templates[framework](route, sourceRef(ctx.project.source.dynamic)),
    );
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
