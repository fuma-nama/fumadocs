import type { Metadata } from 'next';
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import {
  type ComponentProps,
  type FC,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Popup, PopupContent, PopupTrigger } from 'fumadocs-twoslash/ui';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Callout } from 'fumadocs-ui/components/callout';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import * as Preview from '@/components/preview';
import { createMetadata } from '@/lib/metadata';
import { openapi, source } from '@/lib/source';
import { Wrapper } from '@/components/preview/wrapper';
import { metadataImage } from '@/lib/metadata-image';
import { File, Folder, Files } from 'fumadocs-ui/components/files';
import { Mermaid } from '@/components/mdx/mermaid';
import { Rate } from '@/components/rate';
import { repo, owner, onRateAction } from '@/lib/github';
import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import Link from 'fumadocs-core/link';
import { UiOverview } from '@/components/ui-overview';
import { AutoTypeTable } from 'fumadocs-typescript/ui';
import { createGenerator } from 'fumadocs-typescript';
import { getPageTreePeers } from 'fumadocs-core/server';
import { Card, Cards } from 'fumadocs-ui/components/card';

function PreviewRenderer({ preview }: { preview: string }): ReactNode {
  if (preview && preview in Preview) {
    const Comp = Preview[preview as keyof typeof Preview];
    return <Comp />;
  }

  return null;
}

const generator = createGenerator();

export const revalidate = false;

export default async function Page(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<ReactElement> {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();

  const path = `apps/docs/content/docs/${page.file.path}`;
  const preview = page.data.preview;
  const { body: Mdx, toc, lastModified } = await page.data.load();

  return (
    <DocsPage
      toc={toc}
      lastUpdate={lastModified}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk',
        single: false,
      }}
      editOnGithub={{
        repo,
        owner,
        sha: 'dev',
        path,
      }}
      article={{
        className: 'max-sm:pb-16',
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody className="text-fd-foreground/80">
        {preview ? <PreviewRenderer preview={preview} /> : null}
        <Mdx
          components={{
            ...defaultMdxComponents,
            ...((await import('lucide-react')) as unknown as MDXComponents),
            a: ({ href, ...props }) => {
              const found = source.getPageByHref(href ?? '', {
                dir: page.file.dirname,
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
            Popup,
            PopupContent,
            PopupTrigger,
            Tabs,
            Tab,
            Mermaid,
            TypeTable,
            AutoTypeTable: (props) => (
              <AutoTypeTable generator={generator} {...props} />
            ),
            Accordion,
            Accordions,
            Wrapper,
            File,
            Folder,
            Files,
            blockquote: Callout as unknown as FC<ComponentProps<'blockquote'>>,
            APIPage: openapi.APIPage,
            DocsCategory: ({ url }) => {
              return <DocsCategory url={url ?? page.url} />;
            },
            UiOverview,

            ...(await import('@/content/docs/ui/components/tabs.client')),
            ...(await import('@/content/docs/ui/theme.client')),
          }}
        />
        {page.data.index ? <DocsCategory url={page.url} /> : null}
      </DocsBody>
      <Rate onRateAction={onRateAction} />
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

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();

  const description =
    page.data.description ?? 'The library for building documentation sites';

  return createMetadata(
    metadataImage.withImage(page.slugs, {
      title: page.data.title,
      description,
      openGraph: {
        url: `/docs/${page.slugs.join('/')}`,
      },
    }),
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
