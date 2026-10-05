import fs from 'node:fs/promises';
import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import type { I18nInfo, Project } from '@/project';
import {
  addImport,
  addJsxAttribute,
  addVitePlugin,
  findJsxElement,
  wrapNextConfig,
} from '@/codemod';
import { exists } from '@/utils/fs';
import { localeSegment } from '@/project/route';
import { nextProxy, sampleContent, sampleContentCn, templates } from './templates';
import { reactFramework, reactOnly, registerReactRouterRoutes } from '../utils';

const cssImports = (preset: string) => [
  `@import 'fumadocs-ui/css/${preset}.css';`,
  `@import 'fumadocs-ui/css/preset.css';`,
];

export const docs: Feature<{ i18n: boolean }> = {
  id: 'docs',
  title: 'Docs',
  description: 'set up Fumadocs on your app, in a dedicated route group',
  supports: reactOnly,
  options: {
    i18n: { message: 'Enable internationalization?', initialValue: false },
  },
  async detect(project) {
    return exists(path.join(project.cwd, project.baseDir, 'lib/source.ts'));
  },
  async apply(ctx, options) {
    const { project } = ctx;
    const { baseDir, packageJson, config } = project;
    const framework = reactFramework(project);
    // Waku has no optional route segments, the locale is always in the URL
    const i18n = project.i18n ?? (options.i18n ? { optionalLocale: framework !== 'waku' } : null);
    const providerProps: string[] = [];
    if (project.static) providerProps.push('search={{ SearchDialog }}');
    if ('next-themes' in (packageJson.dependencies ?? {}))
      providerProps.push('theme={{ enabled: false }}');

    ctx.addDependencies({
      'fumadocs-core': null,
      'fumadocs-mdx': null,
      'fumadocs-ui': config.uiLibrary === 'base-ui' ? 'npm:@fumadocs/base-ui' : null,
    });
    ctx.addDependencies({ '@types/mdx': null }, true);

    const files = templates[framework]({
      static: project.static,
      i18n,
      provider: project.info.provider,
      providerProps: providerProps.map((prop) => ` ${prop}`).join(''),
    });
    for (const [file, content] of Object.entries(files)) {
      await ctx.write(path.posix.join(baseDir, file), content);
    }
    await ctx.write('content/docs/index.mdx', sampleContent);
    if (i18n) await ctx.write('content/docs/index.cn.mdx', sampleContentCn);
    await ctx.append('.gitignore', ['.source']);
    if (i18n && framework === 'next') await configureProxy(ctx);

    await configureBundler(ctx);
    await configureCss(ctx);
    await suppressHydrationWarning(ctx);
    if (framework === 'react-router') await configureRoutes(ctx, i18n);

    const tsconfig = await fs
      .readFile(path.join(project.cwd, 'tsconfig.json'), 'utf-8')
      .catch(() => '');
    if (!tsconfig.includes('"@/*"')) {
      ctx.note(
        `Generated files import from the \`@/*\` alias, add it to \`tsconfig.json\`:\n  "paths": { "@/*": ["./${baseDir ? `${baseDir}/` : ''}*"] }`,
      );
    }
    if (project.static && framework === 'tanstack-start') {
      ctx.note(
        'In SPA mode, prerender the docs pages and search index, see https://fumadocs.dev/docs/manual-installation/tanstack-start.',
      );
    }
    if (i18n && framework === 'react-router') {
      ctx.note(
        'When prerendering, list the docs pages with `source.getPages().map((page) => page.url)` instead of globbing content files, see https://fumadocs.dev/docs/internationalization/react-router.',
      );
    }
    if (i18n) {
      ctx.note(
        `Languages are configured in \`lib/i18n.ts\`, translated content uses a locale suffix like \`index.cn.mdx\`.\nUI translations: https://fumadocs.dev/docs/internationalization#translations`,
      );
    }
    ctx.note(
      `Start the dev server and open ${i18n && !i18n.optionalLocale ? '/en/docs' : '/docs'} to see your docs.`,
    );
  },
};

/** the Next.js proxy (middleware) file of the project, relative to cwd */
export async function findNextProxy({ cwd, baseDir }: Project) {
  for (const file of ['proxy.ts', 'middleware.ts']) {
    for (const dir of new Set([baseDir, ''])) {
      const target = path.join(dir, file);
      if (await exists(path.join(cwd, target))) return target;
    }
  }
}

/** the i18n middleware redirects & rewrites docs URLs without locale */
async function configureProxy(ctx: FeatureContext) {
  const existing = await findNextProxy(ctx.project);
  if (!existing) {
    await ctx.write(path.join(ctx.project.baseDir, 'proxy.ts'), nextProxy);
    return;
  }

  ctx.note(
    `A proxy already exists at ${existing}, handle the docs locale there. Fumadocs provides \`createI18nMiddleware\` from 'fumadocs-core/i18n/middleware', see https://fumadocs.dev/docs/internationalization/next.`,
  );
}

async function configureBundler(ctx: FeatureContext) {
  const { framework, configFile } = ctx.project;
  const edited =
    configFile !== undefined &&
    (await ctx
      .source(configFile, (file) => {
        const ok =
          framework === 'next'
            ? wrapNextConfig(file)
            : addVitePlugin(
                file,
                { name: 'fumadocsMdx', from: 'fumadocs-mdx/vite' },
                framework === 'waku' ? ['vite', 'plugins'] : ['plugins'],
              );
        if (!ok) throw new Error(`cannot update ${configFile}`);
      })
      .catch(() => false));

  if (!edited) {
    ctx.note(
      framework === 'next'
        ? "Wrap your Next.js config with `createMDX()` from 'fumadocs-mdx/next', see https://fumadocs.dev/docs/mdx/next."
        : "Add `fumadocsMdx()` from 'fumadocs-mdx/vite' to the Vite plugins of your config file.",
    );
  }
}

/** resolve the global CSS file imported by the root file */
async function findCssEntry({ cwd, baseDir, info }: Project): Promise<string | undefined> {
  const rootFile = path.join(baseDir, info.rootFile);
  const content = await fs.readFile(path.join(cwd, rootFile), 'utf-8').catch(() => '');
  const match = /import\s+(?:\w+\s+from\s+)?['"]([^'"]+\.css)(?:\?url)?['"]/.exec(content);
  if (!match) return;
  const specifier = match[1];

  if (specifier.startsWith('@/')) return path.join(baseDir, specifier.slice(2));
  if (specifier.startsWith('.')) return path.join(path.dirname(rootFile), specifier);
}

async function configureCss(ctx: FeatureContext) {
  const { cwd } = ctx.project;
  const preset = (await exists(path.join(cwd, 'components.json'))) ? 'shadcn' : 'neutral';
  const entry = await findCssEntry(ctx.project);
  if (entry && (await exists(path.join(cwd, entry)))) {
    await ctx.append(entry, cssImports(preset));
    return;
  }

  ctx.note(
    `Add the styles to your global CSS file (after \`@import 'tailwindcss'\`):\n  ${cssImports(preset).join('\n  ')}`,
  );
}

/** `next-themes` sets the theme class on `<html>`, React warns about the mismatch without this attribute */
async function suppressHydrationWarning(ctx: FeatureContext) {
  const { baseDir, info } = ctx.project;
  const edited = await ctx.source(path.join(baseDir, info.rootFile), (file) => {
    const html = findJsxElement(file, 'html')?.openingElement;
    if (!html || file.code.slice(html.start, html.end).includes('suppressHydrationWarning')) return;
    addJsxAttribute(file, html, 'suppressHydrationWarning');
  });

  if (!edited)
    ctx.note('Add `suppressHydrationWarning` to the `<html>` element of your root layout.');
}

async function configureRoutes(ctx: FeatureContext, i18n: I18nInfo | null) {
  const added = await registerReactRouterRoutes(ctx, [
    `layout('routes/docs/layout.tsx', [route('${localeSegment('react-router', i18n)}docs/*', 'routes/docs/page.tsx')])`,
    { path: 'api/search', file: 'routes/docs/search.ts', pattern: '/api/search' },
  ]);
  if (!added) return;
  await ctx.source(path.join(ctx.project.baseDir, 'routes.ts'), (file) => {
    addImport(file, { from: '@react-router/dev/routes', named: ['layout', 'route'] });
  });
}
