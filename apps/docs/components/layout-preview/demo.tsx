import type * as PageTree from 'fumadocs-core/page-tree';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { BaseLayoutProps, LinkItemType, NavOptions } from 'fumadocs-ui/layouts/shared';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Heading } from 'fumadocs-ui/components/heading';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { Book, LayoutTemplate, Palette, Rocket, Server, Terminal } from 'lucide-react';
import { usePathname } from 'fumadocs-core/framework';
import type { FC, ReactNode } from 'react';

/** layout options shared by the previews */
export interface PreviewProps {
  nav?: Pick<NavOptions, 'transparentMode'> & {
    title?: string;
  };
  themeSwitch?: Pick<NonNullable<BaseLayoutProps['themeSwitch']>, 'enabled' | 'mode'>;
  searchToggle?: Pick<NonNullable<BaseLayoutProps['searchToggle']>, 'enabled'>;
}

/** pass the options to layout, with the navbar title & links */
export function getLayoutOptions<P extends PreviewProps>(base: string, { nav, ...rest }: P) {
  return {
    ...rest,
    nav: {
      ...nav,
      url: base,
      title: (
        <>
          <span className="size-5 rounded-full border bg-linear-to-br from-fd-primary/60 to-fd-background bg-origin-border" />
          <span className="font-medium">{nav?.title}</span>
        </>
      ),
    },
    links: [
      {
        text: 'Showcase',
        url: 'https://fumadocs.dev/showcase',
        icon: <LayoutTemplate />,
        external: true,
      },
      {
        type: 'icon',
        url: 'https://github.com/fuma-nama/fumadocs',
        label: 'GitHub',
        text: 'GitHub',
        icon: (
          <svg role="img" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        ),
        external: true,
      },
    ] satisfies LinkItemType[],
  };
}

export function createTree(base: string): PageTree.Root {
  function page(name: string, path: string, description: string, icon?: PageTree.Item['icon']) {
    return {
      type: 'page',
      name,
      url: path ? `${base}/${path}` : base,
      description,
      icon,
    } satisfies PageTree.Item;
  }

  return {
    name: 'Docs',
    children: [
      {
        type: 'folder',
        name: 'Framework',
        description: 'Build your docs site',
        root: true,
        icon: <Book />,
        children: [
          { type: 'separator', name: 'Introduction' },
          page('Overview', '', 'An introduction to the framework.', <Book />),
          page('Quick Start', 'quick-start', 'Create your first docs site.', <Rocket />),
          page('Themes', 'themes', 'Customize the colors of your site.', <Palette />),
          { type: 'separator', name: 'Writing' },
          page('Markdown', 'markdown', 'The syntax of Markdown and MDX.'),
          page('Search', 'search', 'Make your content searchable.'),
          {
            type: 'folder',
            name: 'Components',
            children: [
              page('Callout', 'components/callout', 'Highlight important information.'),
              page('Cards', 'components/cards', 'Link to other pages.'),
              page('Tabs', 'components/tabs', 'Switch between content.'),
            ],
          },
          {
            type: 'folder',
            name: 'Deployment',
            children: [
              page('Static Export', 'deployment/static', 'Export your site as static files.'),
              page('Docker', 'deployment/docker', 'Deploy your site in a container.'),
            ],
          },
        ],
      },
      {
        type: 'folder',
        name: 'API Reference',
        description: 'Endpoints of the REST API',
        root: true,
        icon: <Server />,
        children: [
          page('Introduction', 'api', 'Get started with the REST API.', <Terminal />),
          page('Authentication', 'api/authentication', 'Authorize your requests.'),
          {
            type: 'folder',
            name: 'Pages',
            defaultOpen: true,
            children: [
              page('List Pages', 'api/pages', 'Get the pages of a site.'),
              page('Get Page', 'api/pages/get', 'Get the content of a page.'),
              page('Delete Page', 'api/pages/delete', 'Delete a page.'),
            ],
          },
        ],
      },
    ],
  };
}

function findPage(nodes: PageTree.Node[], url: string): PageTree.Item | undefined {
  for (const node of nodes) {
    if (node.type === 'page' && node.url === url) return node;
    if (node.type === 'folder') {
      const result = findPage(node.children, url);
      if (result) return result;
    }
  }
}

const toc: TOCItemType[] = [
  { title: 'Introduction', url: '#introduction', depth: 2 },
  { title: 'Installation', url: '#installation', depth: 2 },
  { title: 'Usage', url: '#usage', depth: 2 },
  { title: 'Configuration', url: '#configuration', depth: 3 },
  { title: 'Deployment', url: '#deployment', depth: 2 },
];

/** the page components of a layout */
interface PageComponents {
  DocsPage: FC<{ toc?: TOCItemType[]; children?: ReactNode }>;
  DocsTitle: FC<{ children?: ReactNode }>;
  DocsDescription: FC<{ children?: ReactNode }>;
  DocsBody: FC<{ children?: ReactNode }>;
}

/** the page of tree at the current pathname */
export function DemoPage({
  tree,
  components: { DocsPage, DocsTitle, DocsDescription, DocsBody },
}: {
  tree: PageTree.Root;
  components: PageComponents;
}) {
  const page = findPage(tree.children, usePathname());

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{page?.name ?? 'Not Found'}</DocsTitle>
      <DocsDescription>{page?.description ?? 'This page is not in the page tree.'}</DocsDescription>
      <DocsBody>
        <DemoContent />
      </DocsBody>
    </DocsPage>
  );
}

const usage = `import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/lib/source';

export default function Layout({ children }) {
  return <DocsLayout tree={source.getPageTree()}>{children}</DocsLayout>;
}`;

function DemoContent() {
  return (
    <>
      <Heading as="h2" id="introduction">
        Introduction
      </Heading>
      <p>
        This is a live preview of the layout. Open the pages in sidebar, search for content, or
        switch the theme, it works like your docs site.
      </p>
      <Cards>
        <Card
          icon={<Rocket />}
          title="Quick Start"
          description="Create your first docs site in minutes."
        />
        <Card
          icon={<Palette />}
          title="Themes"
          description="Customize the colors and the look of your site."
        />
      </Cards>
      <Heading as="h2" id="installation">
        Installation
      </Heading>
      <p>Install the packages with your package manager:</p>
      <Tabs items={['npm', 'pnpm', 'yarn']}>
        <Tab value="npm">
          <DynamicCodeBlock lang="bash" code="npm i fumadocs-ui fumadocs-core" />
        </Tab>
        <Tab value="pnpm">
          <DynamicCodeBlock lang="bash" code="pnpm add fumadocs-ui fumadocs-core" />
        </Tab>
        <Tab value="yarn">
          <DynamicCodeBlock lang="bash" code="yarn add fumadocs-ui fumadocs-core" />
        </Tab>
      </Tabs>
      <Heading as="h2" id="usage">
        Usage
      </Heading>
      <p>
        Wrap your pages with the layout, it takes a page tree which is generated from your content
        files.
      </p>
      <DynamicCodeBlock lang="tsx" code={usage} codeblock={{ title: 'app/docs/layout.tsx' }} />
      <p>
        Navigation items, including the sidebar and layout tabs, highlight the active page. Layout
        tabs show the content of one root folder at a time.
      </p>
      <Heading as="h3" id="configuration">
        Configuration
      </Heading>
      <p>
        Every layout accepts options for the navbar, the theme switch and the search toggle. Options
        specific to a layout are listed on its page.
      </p>
      <Callout title="Good to know">
        For full control over the UI, install the layout with Fumadocs CLI and edit the components
        directly.
      </Callout>
      <Heading as="h2" id="deployment">
        Deployment
      </Heading>
      <p>
        Your docs site is a normal React.js app, deploy it like other apps of your framework. Static
        export is supported when your framework supports it.
      </p>
    </>
  );
}
