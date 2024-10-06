import type { Metadata } from 'next';
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
  DocsCategory,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { type ComponentProps, type FC, Fragment } from 'react';
import defaultComponents from 'fumadocs-ui/mdx';
import { Popup, PopupContent, PopupTrigger } from 'fumadocs-twoslash/ui';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Callout } from 'fumadocs-ui/components/callout';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { createTypeTable } from 'fumadocs-typescript/ui';
import Preview from '@/components/preview';
import { createMetadata, metadataImage } from '@/utils/metadata';
import { openapi, source } from '@/app/source';
import { Wrapper } from '@/components/preview/wrapper';

const { AutoTypeTable } = createTypeTable();

export default async function Page(props: {
  params: Promise<{ slug: string[] }>;
}): Promise<React.ReactElement> {
  const params = await props.params;
  const page = source.getPage(params.slug);

  if (!page) notFound();

  const path = `apps/docs/content/docs/${page.file.path}`;
  const preview = page.data.preview;

  return (
    <DocsPage
      toc={page.data.toc}
      lastUpdate={page.data.lastModified}
      full={page.data.full}
      tableOfContent={{
        style: 'clerk',
        single: false,
      }}
      editOnGithub={{
        repo: 'fumadocs',
        owner: 'fuma-nama',
        sha: 'dev',
        path,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        {preview && preview in Preview ? Preview[preview] : null}
        <page.data.body
          components={{
            ...defaultComponents,
            Popup,
            PopupContent,
            PopupTrigger,
            Tabs,
            Tab,
            TypeTable,
            AutoTypeTable,
            Accordion,
            Accordions,
            Wrapper,
            blockquote: Callout as unknown as FC<ComponentProps<'blockquote'>>,
            APIPage: openapi.APIPage,
            HeadlessOnly:
              params.slug[0] === 'headless' ? Fragment : () => undefined,
            UIOnly: params.slug[0] === 'ui' ? Fragment : () => undefined,
          }}
        />
        {page.data.index ? <DocsCategory page={page} from={source} /> : null}
      </DocsBody>
    </DocsPage>
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

export function generateStaticParams(): { slug: string[] }[] {
  return source.generateParams();
}
