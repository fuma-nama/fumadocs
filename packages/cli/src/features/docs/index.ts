import fs from 'node:fs/promises';
import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import type { I18nInfo, Project } from '@/project';
import {
  addImport,
  addJsxAttribute,
  addVitePlugin,
  findJsxElement,
  type SourceFile,
  wrapNextConfig,
} from '@/codemod';
import { exists } from '@/utils/fs';
import { localeSegment } from '@/project/route';
import {
  astroContentConfig,
  nextProxy,
  sampleContent,
  sampleContentCn,
  templates,
} from './templates';
import { registerReactRouterRoutes } from '../utils';

const cssImports = (preset: string) => [
  `@import 'fumadocs-ui/css/${preset}.css';`,
  `@import 'fumadocs-ui/css/preset.css';`,
];

export const docs: Feature<{ i18n: boolean }> = {
  id: 'docs',
  title: 'Docs',
  description: 'set up Fumadocs on your app, in a dedicated route group',
  options: {
    i18n: { message: 'Enable internationalization?', initialValue: false },
  },
  async detect(project) {
    return exists(path.join(project.cwd, project.baseDir, 'lib/source.ts'));
  },
  async apply(ctx, options) {
    const { project } = ctx;
    const { baseDir, packageJson, config, framework } = project;
    // Waku has no optional route segments, the locale is always in the URL
    const i18n = project.i18n ?? (options.i18n ? { optionalLocale: framework !== 'waku' } : null);
    const providerProps: string[] = [];
    if (project.static) providerProps.push('search={{ SearchDialog }}');
    if ('next-themes' in (packageJson.dependencies ?? {}))
      providerProps.push('theme={{ enabled: false }}');

    ctx.addDependencies({
      'fumadocs-core': null,
      'fumadocs-ui': config.uiLibrary === 'base-ui' ? 'npm:@fumadocs/base-ui' : null,
    });
    // the language pack of `cn`
    if (i18n) ctx.addDependencies({ '@fumadocs/language': null });
    if (framework === 'astro') {
      // the integrations of Fumadocs, React and MDX, Tailwind CSS
      ctx.addDependencies({
        '@fumadocs/astro': null,
        '@astrojs/react': null,
        '@astrojs/mdx': null,
        react: null,
        'react-dom': null,
      });
      ctx.addDependencies(
        {
          '@types/react': null,
          '@types/react-dom': null,
          tailwindcss: null,
          '@tailwindcss/vite': null,
        },
        true,
      );
    } else {
      ctx.addDependencies({ 'fumadocs-mdx': null });
      ctx.addDependencies({ '@types/mdx': null }, true);
    }

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
    if (framework === 'astro') await configureCollections(ctx);
    else await ctx.append('.gitignore', ['.source']);
    if (i18n && framework === 'next') await configureProxy(ctx);

    await configureBundler(ctx);
    await configureCss(ctx);
    // Astro renders `<html>` without React
    if (framework !== 'astro') await suppressHydrationWarning(ctx);
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
    if (framework === 'astro') {
      const layout = path.join(baseDir, project.info.rootFile);
      const content = await fs.readFile(path.join(project.cwd, layout), 'utf-8').catch(() => '');
      if (!content.includes('Astro.props'))
        ctx.note(
          `Docs pages render in \`${layout}\` with \`title\` and \`description\` props, add them to its \`<head>\`.`,
        );
      if (i18n)
        ctx.note(
          `Docs pages pass the locale as \`lang\` to \`${layout}\`, set it on \`<html lang>\`.`,
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

function bundlerEdits({ framework, baseDir }: Project): ((file: SourceFile) => boolean)[] {
  if (framework === 'next') return [wrapNextConfig];
  if (framework === 'astro') {
    return [
      // it adds the React and MDX integrations
      (file) =>
        addVitePlugin(
          file,
          {
            name: 'fumadocs',
            from: '@fumadocs/astro',
            call: `fumadocs({ components: './${path.posix.join(baseDir, 'components/mdx.tsx')}' })`,
            default: true,
          },
          ['integrations'],
        ),
      (file) =>
        addVitePlugin(file, { name: 'tailwindcss', from: '@tailwindcss/vite', default: true }, [
          'vite',
          'plugins',
        ]),
    ];
  }

  return [
    (file) =>
      addVitePlugin(
        file,
        { name: 'fumadocsMdx', from: 'fumadocs-mdx/vite' },
        framework === 'waku' ? ['vite', 'plugins'] : ['plugins'],
      ),
  ];
}

async function configureBundler(ctx: FeatureContext) {
  const { framework, configFile } = ctx.project;
  let edited = false;
  if (configFile) {
    // parse the file for each edit, so it sees the edits before it
    for (const edit of bundlerEdits(ctx.project)) {
      edited = await ctx
        .source(configFile, (file) => {
          if (!edit(file)) throw new Error(`cannot update ${configFile}`);
        })
        .catch(() => false);
      if (!edited) break;
    }
  }
  if (edited) return;

  if (framework === 'next') {
    ctx.note(
      "Wrap your Next.js config with `createMDX()` from 'fumadocs-mdx/next', see https://fumadocs.dev/docs/mdx/next.",
    );
  } else if (framework === 'astro') {
    ctx.note(
      'Add the integrations of Fumadocs to your Astro config, see https://fumadocs.dev/docs/manual-installation/astro.',
    );
  } else {
    ctx.note(
      "Add `fumadocsMdx()` from 'fumadocs-mdx/vite' to the Vite plugins of your config file.",
    );
  }
}

/** Astro content collections of the docs */
async function configureCollections(ctx: FeatureContext) {
  // Astro warns about empty collections
  await ctx.write('content/docs/meta.json', '{\n  "pages": ["..."]\n}\n');
  const file = path.join(ctx.project.baseDir, 'content.config.ts');
  const content = await fs.readFile(path.join(ctx.project.cwd, file), 'utf-8').catch(() => null);
  if (content === null) {
    await ctx.write(file, astroContentConfig);
  } else if (!content.includes('docsLoader(')) {
    ctx.note(
      `A content config already exists at ${file}, add the collections of docs to it:\n${astroContentConfig}`,
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
