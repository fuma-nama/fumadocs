import fs from 'node:fs/promises';
import path from 'node:path';
import type { Feature, FeatureContext } from '@/features';
import type { Project } from '@/project';
import {
  addImport,
  addJsxAttribute,
  addReactRouterRoute,
  addVitePlugin,
  findJsxElement,
  wrapNextConfig,
} from '@/codemod';
import { exists } from '@/utils/fs';
import { sampleContent, templates } from './templates';
import { reactFramework, reactOnly } from '../utils';

const cssImports = (preset: string) => [
  `@import 'fumadocs-ui/css/${preset}.css';`,
  `@import 'fumadocs-ui/css/preset.css';`,
];

export const docs: Feature = {
  id: 'docs',
  title: 'Docs',
  description: 'set up Fumadocs on your app, in a dedicated route group',
  supports: reactOnly,
  async detect(project) {
    return exists(path.join(project.cwd, project.baseDir, 'lib/source.ts'));
  },
  async apply(ctx) {
    const { project } = ctx;
    const { baseDir, packageJson, config } = project;
    const framework = reactFramework(project);
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
      provider: project.info.provider,
      providerProps: providerProps.map((prop) => ` ${prop}`).join(''),
    });
    for (const [file, content] of Object.entries(files)) {
      await ctx.write(path.posix.join(baseDir, file), content);
    }
    await ctx.write('content/docs/index.mdx', sampleContent);
    await ctx.append('.gitignore', ['.source']);

    await configureBundler(ctx);
    await configureCss(ctx);
    await suppressHydrationWarning(ctx);
    if (framework === 'react-router') await configureRoutes(ctx);

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
    ctx.note('Start the dev server and open /docs to see your docs.');
  },
};

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

async function configureRoutes(ctx: FeatureContext) {
  const { baseDir } = ctx.project;
  const edited = await ctx.source(path.join(baseDir, 'routes.ts'), (file) => {
    if (file.code.includes('routes/docs/page.tsx')) return;
    addReactRouterRoute(file, [
      "layout('routes/docs/layout.tsx', [route('docs/*', 'routes/docs/page.tsx')])",
      { path: 'api/search', entry: 'routes/docs/search.ts' },
    ]);
    addImport(file, { from: '@react-router/dev/routes', named: ['layout', 'route'] });
  });

  if (!edited) ctx.note('Register the docs routes in your route config, see `routes/docs`.');
}
