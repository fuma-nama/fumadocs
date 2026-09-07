import path from 'node:path';
import type { Feature } from '@/features';
import type { ReactFramework } from '@/project';
import { addReactRouterRoute, enableProcessedMarkdown } from '@/codemod';
import { docs } from './docs';
import { reactFramework } from './utils';

const getLLMText = `
export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return \`# \${page.data.title} (\${page.url})

\${processed}\`;
}
`;

const index = `import { source } from '@/lib/source';
import { llms } from 'fumadocs-core/source';`;
const full = `import { getLLMText, source } from '@/lib/source';`;
const fullBody = `const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join('\\n\\n'));`;
const markdown = `new Response(await getLLMText(page), {
    headers: {
      'Content-Type': 'text/markdown',
    },
  })`;

const routes: Record<ReactFramework, [file: string, content: string][]> = {
  next: [
    [
      'app/llms.txt/route.ts',
      `${index}

export const revalidate = false;

export function GET() {
  return new Response(llms(source).index());
}
`,
    ],
    [
      'app/llms-full.txt/route.ts',
      `${full}

export const revalidate = false;

export async function GET() {
  ${fullBody}
}
`,
    ],
    [
      'app/llms.mdx/docs/[[...slug]]/route.ts',
      `${full}
import { notFound } from 'next/navigation';

export const revalidate = false;

export async function GET(_req: Request, { params }: RouteContext<'/llms.mdx/docs/[[...slug]]'>) {
  const { slug } = await params;
  const page = source.getPage(slug?.slice(0, -1));
  if (!page) notFound();

  return ${markdown};
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: [...page.slugs, 'content.md'],
  }));
}
`,
    ],
  ],
  'react-router': [
    [
      'llms/index.ts',
      `${index}

export function loader() {
  return new Response(llms(source).index());
}
`,
    ],
    [
      'llms/full.ts',
      `${full}

export async function loader() {
  ${fullBody}
}
`,
    ],
    [
      'llms/mdx.ts',
      `import type { Route } from './+types/mdx';
${full}

export async function loader({ params }: Route.LoaderArgs) {
  const slugs = params['*'].split('/').filter((v) => v.length > 0);
  // remove the appended "content.md"
  slugs.pop();
  const page = source.getPage(slugs);
  if (!page) return new Response('not found', { status: 404 });

  return ${markdown};
}
`,
    ],
  ],
  'tanstack-start': [
    [
      'routes/llms[.]txt.ts',
      `import { createFileRoute } from '@tanstack/react-router';
${index}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET() {
        return new Response(llms(source).index());
      },
    },
  },
});
`,
    ],
    [
      'routes/llms-full[.]txt.ts',
      `import { createFileRoute } from '@tanstack/react-router';
${full}

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () => {
        ${fullBody.replaceAll('\n  ', '\n        ')}
      },
    },
  },
});
`,
    ],
    [
      'routes/docs/{$}[.]md.ts',
      `import { createFileRoute, notFound } from '@tanstack/react-router';
${full}

export const Route = createFileRoute('/docs/{$}.md')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slugs = params._splat?.split('/') ?? [];
        // remove the ".md" suffix
        slugs[slugs.length - 1] = slugs[slugs.length - 1].replace(/\\.md$/, '');
        if (slugs.length === 1 && slugs[0] === 'index') slugs.pop();
        const page = source.getPage(slugs);
        if (!page) throw notFound();

        return ${markdown.replaceAll('\n  ', '\n        ')};
      },
    },
  },
});
`,
    ],
  ],
  waku: [
    [
      'pages/_api/llms.txt.ts',
      `${index}

export function GET() {
  return new Response(llms(source).index());
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
`,
    ],
    [
      'pages/_api/llms-full.txt.ts',
      `${full}

export async function GET() {
  ${fullBody}
}

export async function getConfig() {
  return {
    render: 'static' as const,
  } as const;
}
`,
    ],
    [
      'pages/_api/llms.mdx/docs/[...slugs]/content.md.ts',
      `${full}
import type { ApiContext } from 'waku/router';
import { unstable_notFound } from 'waku/router/server';

export async function GET(
  _: Request,
  { params }: ApiContext<'/llms.mdx/docs/[...slugs]/content.md'>,
) {
  const page = source.getPage(params.slugs);
  if (!page) unstable_notFound();

  return ${markdown};
}

export async function getConfig() {
  return {
    render: 'static' as const,
    staticPaths: source.generateParams().map((item) => item.slug),
  } as const;
}
`,
    ],
  ],
};

export const llms: Feature = {
  id: 'llms',
  title: 'LLM Routes',
  description: 'serve docs as Markdown for LLMs: llms.txt, llms-full.txt and per-page Markdown',
  requires: [docs],
  async apply(ctx) {
    const { baseDir } = ctx.project;
    const framework = reactFramework(ctx.project);
    const sourceFile = path.join(baseDir, 'lib/source.ts');
    const edited = await ctx.source(sourceFile, (file) => {
      if (!enableProcessedMarkdown(file))
        throw new Error(`cannot find \`defineDocs()\` in ${sourceFile}`);
    });
    if (!edited) throw new Error(`${sourceFile} not found`);
    await ctx.append(sourceFile, [getLLMText]);

    for (const [file, content] of routes[framework])
      await ctx.write(path.join(baseDir, file), content);

    if (framework === 'react-router') {
      await ctx.source(path.join(baseDir, 'routes.ts'), (file) => {
        if (file.code.includes('llms/index.ts')) return;
        addReactRouterRoute(file, [
          { path: 'llms.txt', entry: 'llms/index.ts' },
          { path: 'llms-full.txt', entry: 'llms/full.ts' },
          { path: 'llms.mdx/docs/*', entry: 'llms/mdx.ts' },
        ]);
      });
    }

    const markdownUrl =
      framework === 'tanstack-start' ? '`${page.url}.md`' : '`/llms.mdx${page.url}/content.md`';
    ctx.note(
      `Add page actions to your docs page with \`MarkdownCopyButton\` and \`ViewOptionsPopover\` from 'fumadocs-ui/layouts/docs/page', the Markdown URL of a page is ${markdownUrl}.`,
    );
  },
};
