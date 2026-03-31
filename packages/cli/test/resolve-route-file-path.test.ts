import { expect, test } from 'vitest';
import type { Framework } from '@/config';
import { resolveRouteFilePath } from '@/utils/framework';

test('next: app/ + app router route.ts path (incl. optional catch-all)', () => {
  expect(resolveRouteFilePath('api/auth/[[...slug]]', 'next')).toBe(
    'app/api/auth/[[...slug]]/route.ts',
  );
  expect(resolveRouteFilePath('api/foo/[...slug]', 'next')).toBe('app/api/foo/[...slug]/route.ts');
  expect(resolveRouteFilePath('/api/foo/', 'next')).toBe('app/api/foo/route.ts');
});

test('next: custom extension', () => {
  expect(resolveRouteFilePath('api/foo', 'next', 'tsx')).toBe('app/api/foo/route.tsx');
});

test('tanstack-start: routes/ + flattened $ / splat filenames', () => {
  const fw = 'tanstack-start' as const satisfies Framework;
  expect(resolveRouteFilePath('api/handler', fw)).toBe('routes/api.handler.ts');
  expect(resolveRouteFilePath('/api/foo/', fw)).toBe('routes/api.foo.ts');
  expect(resolveRouteFilePath('api/posts/[id]', fw)).toBe('routes/api.posts.$id.ts');
  expect(resolveRouteFilePath('api/foo/[[...slug]]', fw)).toBe('routes/api.foo.$.ts');
  expect(resolveRouteFilePath('api/foo/[...slug]', fw)).toBe('routes/api.foo.$.ts');
  expect(resolveRouteFilePath('posts/[slug]/edit', fw)).toBe('routes/posts.$slug.edit.ts');
});

test('react-router: routes/ + nested path ($ dynamic, $ splat)', () => {
  const fw = 'react-router' as const satisfies Framework;
  expect(resolveRouteFilePath('api/handler', fw)).toBe('app/routes/api/handler.ts');
  expect(resolveRouteFilePath('/api/foo/', fw)).toBe('app/routes/api/foo.ts');
  expect(resolveRouteFilePath('api/posts/[id]', fw)).toBe('app/routes/api/posts/$id.ts');
  expect(resolveRouteFilePath('api/foo/[[...slug]]', fw)).toBe('app/routes/api/foo/all.ts');
  expect(resolveRouteFilePath('api/foo/[...slug]', fw)).toBe('app/routes/api/foo/all.ts');
  expect(resolveRouteFilePath('posts/[slug]/edit', fw)).toBe('app/routes/posts/$slug/edit.ts');
});

test('waku: pages/_api/ + [...] catch-all normalization', () => {
  expect(resolveRouteFilePath('api/handler', 'waku')).toBe('pages/_api/api/handler.ts');
  expect(resolveRouteFilePath('api/foo/[[...slug]]', 'waku')).toBe(
    'pages/_api/api/foo/[...slug].ts',
  );
  expect(resolveRouteFilePath('api/foo/[...slug]', 'waku')).toBe('pages/_api/api/foo/[...slug].ts');
  expect(resolveRouteFilePath('api/items/[id]', 'waku')).toBe('pages/_api/api/items/[id].ts');
});
