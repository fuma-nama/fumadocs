'use client';
import { HomeLayout, type HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import type { LinkItemType } from 'fumadocs-ui/layouts/shared';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Book, ComponentIcon, Rocket, Search, Server, Terminal, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getLayoutOptions, type PreviewProps } from './demo';

const base = '/story/home';

const menu: LinkItemType = {
  type: 'menu',
  text: 'Documentation',
  items: [
    {
      text: 'Getting Started',
      description: 'Learn to use Fumadocs on your docs site.',
      url: 'https://fumadocs.dev/docs',
      icon: <Book />,
      external: true,
    },
    {
      text: 'Components',
      description: 'Add interactive experience to your docs.',
      url: 'https://fumadocs.dev/docs/ui/components',
      icon: <ComponentIcon />,
      external: true,
    },
  ],
};

const features = [
  { icon: <Rocket />, title: 'Fast', description: 'Pages are rendered on the server by default.' },
  { icon: <Search />, title: 'Search', description: 'Find content with the built-in search.' },
  { icon: <ComponentIcon />, title: 'Components', description: 'Tabs, callouts, cards and more.' },
  { icon: <Server />, title: 'OpenAPI', description: 'Generate docs for your REST API.' },
  { icon: <Terminal />, title: 'CLI', description: 'Install components to customize them.' },
  { icon: <Zap />, title: 'Flexible', description: 'Works with your React.js framework.' },
];

export interface HomeLayoutPreviewProps extends PreviewProps {
  nav?: PreviewProps['nav'] & Pick<NonNullable<HomeLayoutProps['nav']>, 'enableHoverToOpen'>;
}

export function HomeLayoutPreview(props: HomeLayoutPreviewProps) {
  const options = getLayoutOptions(base, props);

  return (
    <HomeLayout {...options} links={[menu, ...options.links]}>
      <div className="flex flex-col items-center gap-4 px-4 pt-24 pb-16 text-center">
        <h1 className="text-4xl font-semibold">Build excellent docs sites</h1>
        <p className="max-w-lg text-fd-muted-foreground">
          This is a live preview of the layout, open the navigation menu, search for content, or
          switch the theme.
        </p>
        <div className="flex gap-2">
          <a
            href="https://fumadocs.dev/docs"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ variant: 'primary' }), 'rounded-full px-4')}
          >
            Get Started
          </a>
          <a
            href="https://github.com/fuma-nama/fumadocs"
            target="_blank"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ variant: 'secondary' }), 'rounded-full px-4')}
          >
            GitHub
          </a>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-(--fd-layout-width) grid-cols-1 gap-3 px-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col gap-1 rounded-xl border bg-fd-card p-4 text-sm [&_svg]:mb-2 [&_svg]:size-5 [&_svg]:text-fd-primary"
          >
            {feature.icon}
            <p className="font-medium">{feature.title}</p>
            <p className="text-fd-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </HomeLayout>
  );
}
