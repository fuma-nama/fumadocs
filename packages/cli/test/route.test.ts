import { expect, test } from 'vitest';
import { formatRoute, type RouteDescriptor } from '@/project/route';
import type { ReactFramework } from '@/project';

const frameworks: ReactFramework[] = ['next', 'react-router', 'tanstack-start', 'waku'];

const routes: Record<string, RouteDescriptor> = {
  markdown: {
    segments: [
      '/llms.mdx/docs',
      { param: 'slug', catchAll: true, optional: true, suffix: 'content.md' },
    ],
    locale: true,
  },
  og: {
    segments: ['/og/docs', { param: 'slug', catchAll: true, suffix: 'image.png' }],
    locale: true,
  },
  mcp: { segments: ['api/mcp'] },
  'llms.txt': { segments: ['llms.txt'] },
  'root docs markdown': {
    segments: ['/llms.mdx', { param: 'slug', catchAll: true, suffix: 'content.md' }],
  },
};

test('format routes', async () => {
  const out: Record<string, unknown> = {};
  for (const [name, route] of Object.entries(routes)) {
    for (const framework of frameworks) {
      out[`${name} (${framework})`] = formatRoute(route, framework, null);
      out[`${name} (${framework}, i18n)`] = formatRoute(route, framework, {
        optionalLocale: true,
      });
    }
  }
  out['tanstack markdown'] = formatRoute(
    { segments: ['/docs', '{$}.md'], locale: true },
    'tanstack-start',
    {
      optionalLocale: true,
    },
  );
  await expect(out).toMatchFileSnapshot('fixtures/routes.snapshot.txt');
});
