import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import * as Preview from '@/components/preview';
import { createMetadata, getPageImageUrl } from '@/lib/metadata';
import { source } from '@/lib/source';
import { Feedback, FeedbackText } from '@/components/feedback/client';
import { onBlockFeedbackAction, onPageFeedbackAction, owner, repo } from '@/lib/github';
import {
  DocsBody,
  DocsPage,
  PageLastUpdate,
  MarkdownCopyButton,
  ViewOptionsPopover,
  DocsPageProps,
} from 'fumadocs-ui/layouts/spacious/page';
import { NotFound } from '@/components/layouts/not-found';
import { getSuggestions } from './suggestions';
import { getPageComponents } from '@/components/mdx/page';
import { AsyncAPIPageLazy, GraphQLPageLazy, OpenAPIPageLazy } from './lazy';
import { SponsorsMarquee } from '@fumari/sponsors';
import { frameworks, isFramework } from '@/lib/framework';
import { redirect } from 'next/navigation';

function PreviewRenderer({ preview }: { preview: string }): ReactNode {
  if (preview && preview in Preview) {
    const Comp = Preview[preview as keyof typeof Preview];
    return <Comp />;
  }

  return null;
}

export const revalidate = false;

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) {
    // a page of `[framework]` that only some frameworks have, like `/docs/astro/integrations/og/next`
    const [first, ...rest] = params.slug ?? [];
    if (isFramework(first)) {
      for (const { value } of frameworks) {
        const other = source.getPage([value, ...rest]);
        if (other) redirect(other.url);
      }
    }

    return (
      <NotFound
        getSuggestions={async () => (params.slug ? getSuggestions(params.slug.join(' ')) : [])}
      />
    );
  }

  const pageProps = {
    tableOfContent: {
      footer: <SponsorsMarquee />,
    },
  } satisfies Partial<DocsPageProps>;

  if (page.type === 'openapi') {
    return (
      <DocsPage full {...pageProps}>
        <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>

        <DocsBody>
          <OpenAPIPageLazy {...page.data.getOpenAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }

  if (page.type === 'asyncapi') {
    return (
      <DocsPage full {...pageProps}>
        <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>

        <DocsBody>
          <AsyncAPIPageLazy {...page.data.getAsyncAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }

  if (page.type === 'graphql') {
    return (
      <DocsPage full {...pageProps}>
        <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>

        <DocsBody>
          <GraphQLPageLazy {...page.data.getGraphQLPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }

  const { body: Mdx, toc, lastModified } = await page.data.load();

  return (
    <DocsPage toc={toc} {...pageProps}>
      <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>
      <p className="text-lg text-fd-muted-foreground mb-2">{page.data.description}</p>
      <div className="flex flex-row flex-wrap gap-2 items-center border-b pb-6 mb-4">
        <MarkdownCopyButton markdownUrl={`${page.url}.md`} />
        <ViewOptionsPopover
          markdownUrl={`${page.url}.md`}
          githubUrl={`https://github.com/${owner}/${repo}/blob/dev/apps/docs/content/docs/${encodeURI(page.path)}`}
        />
      </div>
      <div className="prose flex-1 text-fd-foreground/90">
        {page.data.preview && <PreviewRenderer preview={page.data.preview} />}
        <FeedbackText onSendAction={onBlockFeedbackAction}>
          <Mdx components={getPageComponents(page)} />
        </FeedbackText>
      </div>
      <Feedback onSendAction={onPageFeedbackAction} />
      {lastModified && <PageLastUpdate date={lastModified} />}
    </DocsPage>
  );
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = source.getPage(slug);
  if (!page)
    return createMetadata({
      title: 'Not Found',
    });

  const description = page.data.description ?? 'The library for building documentation sites';

  const image = {
    url: getPageImageUrl(page).url,
    width: 1200,
    height: 630,
  };

  return createMetadata({
    title: page.data.title,
    description,
    openGraph: {
      url: `/docs/${page.slugs.join('/')}`,
      images: [image],
    },
    twitter: {
      images: [image],
    },
    alternates: {
      types: page.type === 'docs' ? { 'text/markdown': `${page.url}.md` } : undefined,
    },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
