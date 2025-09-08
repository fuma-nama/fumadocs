import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ComponentProps, type FC, type ReactNode } from 'react';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Callout } from 'fumadocs-ui/components/callout';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import * as Preview from '@/components/preview';
import { createMetadata } from '@/lib/metadata';
import { source } from '@/lib/source';
import { Wrapper } from '@/components/preview/wrapper';
import { Mermaid } from '@/components/mdx/mermaid';
import { Feedback } from '@/components/feedback';
import { onRateAction, owner, repo } from '@/lib/github';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import Link from 'fumadocs-core/link';
import { AutoTypeTable } from 'fumadocs-typescript/ui';
import { createGenerator } from 'fumadocs-typescript';
import { getPageTreePeers } from 'fumadocs-core/server';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { getMDXComponents } from '@/mdx-components';
import { APIPage } from 'fumadocs-openapi/ui';
import { LLMCopyButton, ViewOptions } from '@/components/ai/page-actions';
import * as path from 'node:path';
import { Banner } from 'fumadocs-ui/components/banner';
import { openapi } from '@/lib/openapi';
import { Installation } from '@/components/preview/installation';
import { Customisation } from '@/components/preview/customisation';
import { DocsPage } from 'fumadocs-ui/page';

function PreviewRenderer({ preview }: { preview: string }): ReactNode {
  if (preview && preview in Preview) {
    const Comp = Preview[preview as keyof typeof Preview];
    return <Comp />;
  }

  return null;
}

const generator = createGenerator();

export const revalidate = false;

export default async function Page(props: PageProps<'/docs/[...slug]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();

  const preview = page.data.preview;
  const { body: Mdx, toc, lastModified } = page.data;

  return (
    <DocsPage
      toc={toc}
      lastUpdate={lastModified ? new Date(lastModified) : undefined}
      tableOfContent={{
        style: 'clerk',
      }}
    >
      <h1 className="text-[1.75em] font-semibold">{page.data.title}</h1>
      <p className="text-lg text-fd-muted-foreground">
        {page.data.description}
      </p>
      <div className="flex flex-row gap-2 items-center border-b pt-2 pb-6">
        <LLMCopyButton markdownUrl={`${page.url}.mdx`} />
        <ViewOptions
          markdownUrl={`${page.url}.mdx`}
          githubUrl={`https://github.com/${owner}/${repo}/blob/dev/apps/docs/content/docs/${page.path}`}
        />
      </div>
      <div className="prose flex-1 text-fd-foreground/80">
        {preview ? <PreviewRenderer preview={preview} /> : null}
        <Mdx
          components={getMDXComponents({
            ...Twoslash,
            a: ({ href, ...props }) => {
              const found = source.getPageByHref(href ?? '', {
                dir: path.dirname(page.path),
              });

              if (!found) return <Link href={href} {...props} />;

              return (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Link
                      href={
                        found.hash
                          ? `${found.page.url}#${found.hash}`
                          : found.page.url
                      }
                      {...props}
                    />
                  </HoverCardTrigger>
                  <HoverCardContent className="text-sm">
                    <p className="font-medium">{found.page.data.title}</p>
                    <p className="text-fd-muted-foreground">
                      {found.page.data.description}
                    </p>
                  </HoverCardContent>
                </HoverCard>
              );
            },
            Banner,
            Mermaid,
            TypeTable,
            AutoTypeTable: (props) => (
              <AutoTypeTable generator={generator} {...props} />
            ),
            Wrapper,
            blockquote: Callout as unknown as FC<ComponentProps<'blockquote'>>,
            APIPage: (props) => <APIPage {...openapi.getAPIPageProps(props)} />,
            DocsCategory: ({ url }) => {
              return <DocsCategory url={url ?? page.url} />;
            },
            Installation,
            Customisation,
            ...(await import('@/content/docs/ui/components/tabs.client')),
            ...(await import('@/content/docs/ui/theme.client')),
          })}
        />
        {page.data.index ? <DocsCategory url={page.url} /> : null}
      </div>
      <Feedback onRateAction={onRateAction} />
    </DocsPage>
  );
}

function DocsCategory({ url }: { url: string }) {
  return (
    <Cards>
      {getPageTreePeers(source.pageTree, url).map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url}>
          {peer.description}
        </Card>
      ))}
    </Cards>
  );
}

export async function generateMetadata(
  props: PageProps<'/docs/[...slug]'>,
): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const description =
    page.data.description ?? 'The library for building documentation sites';

  const image = {
    url: ['/og', ...slug, 'image.webp'].join('/'),
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
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
