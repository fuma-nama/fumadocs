import { expect, test } from 'vitest';
import { addReactRouterRouteToFile } from '@/utils/framework';

/** Dry run only: never persist to disk. */
const shouldWrite = false;

const routesTs = 'app/routes.ts';
const routesTsx = 'app/routes.tsx';

const sample = `import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('api/search', 'routes/search.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
`;

test('inserts route before splat', async () => {
  const r = await addReactRouterRouteToFile(
    routesTs,
    sample,
    { path: 'api/chat', module: 'routes/api.chat.ts' },
    shouldWrite,
  );
  expect(r.added).toBe(true);
  expect(r.content).toMatchInlineSnapshot(`
    "import { index, route, type RouteConfig } from '@react-router/dev/routes';

    export default [
      index('routes/home.tsx'),
      route('api/search', 'routes/search.ts'),
      route('api/chat', 'routes/api.chat.ts'),
      route('*', 'routes/not-found.tsx'),
    ] satisfies RouteConfig;
    "
  `);
});

test('duplicate route returns added: false and original content', async () => {
  const first = await addReactRouterRouteToFile(
    routesTs,
    sample,
    { path: 'api/chat', module: 'routes/api.chat.ts' },
    shouldWrite,
  );
  expect(first.added).toBe(true);

  const second = await addReactRouterRouteToFile(
    routesTs,
    first.content,
    { path: 'api/chat', module: 'routes/api.chat.ts' },
    shouldWrite,
  );
  expect(second).toEqual({ added: false, content: first.content });
});

test('duplicate of existing route in source returns added: false', async () => {
  const r = await addReactRouterRouteToFile(
    routesTs,
    sample,
    { path: 'api/search', module: 'routes/search.ts' },
    shouldWrite,
  );
  expect(r).toEqual({ added: false, content: sample });
});

test('appends when no splat', async () => {
  const noSplat = `import { route, type RouteConfig } from '@react-router/dev/routes';

export default [
  route('a', 'routes/a.ts'),
] satisfies RouteConfig;
`;
  const r = await addReactRouterRouteToFile(
    routesTs,
    noSplat,
    { path: 'b', module: 'routes/b.ts' },
    shouldWrite,
  );
  expect(r.content).toMatchInlineSnapshot(`
    "import { route, type RouteConfig } from '@react-router/dev/routes';

    export default [
      route('a', 'routes/a.ts'),
      route('b', 'routes/b.ts'),
    ] satisfies RouteConfig;
    "
  `);
});

test('escapes single quotes in path and module', async () => {
  const initial = `import { route, type RouteConfig } from '@react-router/dev/routes';
export default [] satisfies RouteConfig;
`;
  const r = await addReactRouterRouteToFile(
    routesTs,
    initial,
    { path: "it's/x", module: "routes/x's.ts" },
    shouldWrite,
  );
  expect(r.content).toMatchInlineSnapshot(`
    "import { route, type RouteConfig } from '@react-router/dev/routes';
    export default [
      route('it\\'s/x', 'routes/x\\'s.ts'),
    ] satisfies RouteConfig;
    "
  `);
});

test('inserts index route before splat', async () => {
  const initial = `import { index, route, type RouteConfig } from '@react-router/dev/routes';
export default [
  route('api/x', 'routes/x.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
`;
  const r = await addReactRouterRouteToFile(
    routesTs,
    initial,
    { kind: 'index', module: 'routes/landing.tsx' },
    shouldWrite,
  );
  expect(r.added).toBe(true);
  expect(r.content).toMatchInlineSnapshot(`
    "import { index, route, type RouteConfig } from '@react-router/dev/routes';
    export default [
      route('api/x', 'routes/x.ts'),
      index('routes/landing.tsx'),
      route('*', 'routes/not-found.tsx'),
    ] satisfies RouteConfig;
    "
  `);
});

test('duplicate index returns added: false', async () => {
  const initial = `import { index, type RouteConfig } from '@react-router/dev/routes';
export default [
  index('routes/home.tsx'),
] satisfies RouteConfig;
`;
  expect(
    await addReactRouterRouteToFile(
      routesTs,
      initial,
      { kind: 'index', module: 'routes/home.tsx' },
      shouldWrite,
    ),
  ).toEqual({ added: false, content: initial });
});

test('unwraps export default array with as RouteConfig', async () => {
  const initial = `import { route, type RouteConfig } from '@react-router/dev/routes';
export default [
  route('a', 'routes/a.ts'),
] as RouteConfig;
`;
  const r = await addReactRouterRouteToFile(
    routesTs,
    initial,
    { path: 'b', module: 'routes/b.ts' },
    shouldWrite,
  );
  expect(r.content).toMatchInlineSnapshot(`
    "import { route, type RouteConfig } from '@react-router/dev/routes';
    export default [
      route('a', 'routes/a.ts'),
      route('b', 'routes/b.ts'),
    ] as RouteConfig;
    "
  `);
});

test('parses .tsx routes config path', async () => {
  const initial = `import { route, type RouteConfig } from '@react-router/dev/routes';
export default [] satisfies RouteConfig;
`;
  const r = await addReactRouterRouteToFile(
    routesTsx,
    initial,
    { path: 'x', module: 'routes/x.tsx' },
    shouldWrite,
  );
  expect(r.content).toMatchInlineSnapshot(`
    "import { route, type RouteConfig } from '@react-router/dev/routes';
    export default [
      route('x', 'routes/x.tsx'),
    ] satisfies RouteConfig;
    "
  `);
});

test('throws when no export default route array', async () => {
  const bad = `export const notRoutes = 1;\n`;

  await expect(
    addReactRouterRouteToFile(routesTs, bad, { path: 'a', module: 'routes/a.ts' }, shouldWrite),
  ).rejects.toThrow(/no export default array found/);
});

test('throws on parse errors', async () => {
  const bad = `export default [ @@@`;

  await expect(
    addReactRouterRouteToFile(routesTs, bad, { path: 'a', module: 'routes/a.ts' }, shouldWrite),
  ).rejects.toThrow(/failed to parse/);
});
