import type { Framework } from '@/config';
import { buildRouteHandlerFile } from '@/registry/macros/route-handler.build';
import MagicString from 'magic-string';
import path from 'node:path';
import { parseSync } from 'oxc-parser';
import { expect, test } from 'vitest';

export interface BuildRouteHandlerFileOptions {
  route: string;
  /** Resolved absolute path for the emitted route module (used for `lang` / parse filename). */
  routeFilePath: string;
  framework: Framework;
  /** Source text (registry component output or app source) containing a `$routeHandler` call. */
  compiledContent: string;
}

export function buildRouteHandlerFromString(options: BuildRouteHandlerFileOptions): string {
  const { route, routeFilePath, framework, compiledContent } = options;

  const lang = path.extname(routeFilePath) === '.tsx' ? 'tsx' : 'ts';
  const result = parseSync(routeFilePath, compiledContent, { lang, astType: 'ts' });
  if (result.errors.length > 0) {
    throw new Error(
      `route-handler.build: failed to parse ${routeFilePath}:\n${result.errors.map((e) => e.message).join('\n')}`,
    );
  }

  const program = result.program;
  const s = new MagicString(options.compiledContent);
  buildRouteHandlerFile(route, routeFilePath, framework, program, s);
  return s.toString();
}

const sample = `import { $routeHandler } from '@fumadocs/cli/registry/macros/route-handler';

export const handler = $routeHandler(
  { methods: ['GET', 'POST'], params: ['id'] },
  async (req, p) => Response.json({ id: p.id }),
);
`;

test('next: native verb exports, inlined body, params from ctx', () => {
  const out = buildRouteHandlerFromString({
    route: 'api/posts/[id]',
    routeFilePath: '/proj/app/api/posts/[id]/route.ts',
    framework: 'next',
    compiledContent: sample,
  });
  expect(out).toMatchInlineSnapshot(`
    "export async function GET(req: Request, ctx: RouteContext<"/api/posts/[id]">) {
      const p = {
        id: (await ctx.params).id
      };
      return Response.json({ id: p.id });
    }

    export async function POST(req: Request, ctx: RouteContext<"/api/posts/[id]">) {
      const p = {
        id: (await ctx.params).id
      };
      return Response.json({ id: p.id });
    }"
  `);
});

test('next: inlines dynamic + params object when route has segments', () => {
  const src = `import { $routeHandler } from '@fumadocs/cli/registry/macros/route-handler';
export const h = $routeHandler(
  { methods: ['GET'], params: ['id'], catchAll: 'rest' },
  async (request, p) => Response.json({ request, p }),
);
`;
  const out = buildRouteHandlerFromString({
    route: 'api/items/[id]/[...rest]',
    routeFilePath: '/proj/app/api/items/[id]/[...rest]/route.ts',
    framework: 'next',
    compiledContent: src,
  });
  expect(out).toMatchInlineSnapshot(`
    "export async function GET(request: Request, ctx: RouteContext<"/api/items/[id]/[...rest]">) {
      const p = {
        id: (await ctx.params).id,
        rest: (await ctx.params).rest
      };
      return Response.json({ request, p });
    }"
  `);
});

test('tanstack-start: createFileRoute + per-verb handlers with ctx.request alias', () => {
  const out = buildRouteHandlerFromString({
    route: 'api/posts/[id]',
    routeFilePath: '/proj/routes/api.posts.$id.ts',
    framework: 'tanstack-start',
    compiledContent: sample,
  });
  expect(out).toMatchInlineSnapshot(`
    "import { createFileRoute } from '@tanstack/react-router';

    export const Route = createFileRoute("/api/posts/$id")({
      server: {
        handlers: {
          GET: async (ctx) => {
            const req = ctx.request;
            const p = {
              id: ctx.params.id
            };
            return Response.json({ id: p.id });
          },
          POST: async (ctx) => {
            const req = ctx.request;
            const p = {
              id: ctx.params.id
            };
            return Response.json({ id: p.id });
          },
        },
      },
    });"
  `);
});

test('react-router: async loader + action, args.request alias', () => {
  const out = buildRouteHandlerFromString({
    route: 'api/posts/[id]',
    routeFilePath: '/proj/routes/api/posts/$id.ts',
    framework: 'react-router',
    compiledContent: sample,
  });
  expect(out).toMatchInlineSnapshot(`
    "import type { Route } from './+types/$id';

    export async function loader(args: Route.LoaderArgs) {
      const req = args.request;
      const p = {
        id: args.params.id
      };
      return Response.json({ id: p.id });
    }

    export async function action(args: Route.ActionArgs) {
      const req = args.request;
      const p = {
        id: args.params.id
      };
      return Response.json({ id: p.id });
    }"
  `);
});

test('react-router: GET-only omits action', () => {
  const getOnly = `import { $routeHandler } from '@fumadocs/cli/registry/macros/route-handler';

export const handler = $routeHandler(
  { methods: ['GET'], params: [] },
  async () => new Response('ok'),
);
`;
  const out = buildRouteHandlerFromString({
    route: 'api/x',
    routeFilePath: '/proj/routes/api/x.ts',
    framework: 'react-router',
    compiledContent: getOnly,
  });
  expect(out).toMatchInlineSnapshot(`
    "import type { Route } from './+types/x';

    export async function loader(args: Route.LoaderArgs) {
      const request = args.request;
      return new Response('ok');
    }"
  `);
});

test('no-op when there is no $routeHandler import', () => {
  const src = `export const x = 1;
`;
  const out = buildRouteHandlerFromString({
    route: 'api/x',
    routeFilePath: '/proj/app/api/x/route.ts',
    framework: 'next',
    compiledContent: src,
  });
  expect(out).toBe(src);
});

test('no-op when $routeHandler is imported but never called', () => {
  const src = `import { $routeHandler } from '@fumadocs/cli/registry/macros/route-handler';

export const setup = true;
`;
  const out = buildRouteHandlerFromString({
    route: 'api/x',
    routeFilePath: '/proj/app/api/x/route.ts',
    framework: 'next',
    compiledContent: src,
  });
  expect(out).toBe(src);
});
