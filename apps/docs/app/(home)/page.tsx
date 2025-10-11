import Hero from './hero.svg';
import Image from 'next/image';
import { Tinos } from 'next/font/google';
import { cn } from '@/lib/cn';
import Link from 'next/link';
import SourceImage from '@/public/source.png';
import ComponentsImage from './components.png';
import { cva } from 'class-variance-authority';
import {
  CpuIcon,
  FileEditIcon,
  FileTextIcon,
  HeartIcon,
  LayoutIcon,
  LibraryIcon,
  LucideIcon,
  PaperclipIcon,
  SearchIcon,
  Terminal,
} from 'lucide-react';
import { Marquee } from '@/app/(home)/marquee';
import { CodeBlock } from '@/components/code-block';
import {
  CreateAppAnimation,
  PreviewImages,
  Writing,
} from '@/app/(home)/page.client';
import type { HTMLAttributes, ReactNode } from 'react';

const tinos = Tinos({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-tinos',
});

const buttonVariants = cva(
  'inline-flex px-5 py-3 rounded-full font-medium tracking-tight transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-foreground hover:bg-brand-200',
        secondary:
          'border bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

const linkVariants = cva('text-sm hover:underline');

export default function Page() {
  return (
    <main
      className={cn(
        'mx-auto w-full max-w-[1400px] text-landing-foreground dark:text-landing-foreground-dark',
        tinos.variable,
      )}
    >
      <div className="grid">
        <div className="overflow-hidden col-start-1 row-start-1">
          <Image
            sizes="(max-width: 800px) 800px, (max-width: 1400px) 100vw, 1400px"
            src={Hero}
            alt="noise"
            className="min-w-[800px] pointer-events-none select-none"
            priority
          />
        </div>
        <div className="mt-auto mb-12 text-landing-foreground-dark p-6 col-start-1 row-start-1 md:p-12 md:mb-40">
          <h1 className="text-4xl mt-40 mb-12 leading-tighter font-tinos md:text-5xl lg:text-6xl">
            Build the excellent
            <br />
            documentation
            <br />
            in your way.
          </h1>
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
            <Link href="/docs" className={cn(buttonVariants())}>
              Getting Started
            </Link>
            <a
              href="https://codesandbox.io/p/sandbox/github/fuma-nama/fumadocs-ui-template"
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ variant: 'secondary' }))}
            >
              Open CodeSandbox
            </a>
            <p className="text-sm">the React.js docs framework you love.</p>
          </div>
        </div>
      </div>
      <div className="px-6 md:px-12">
        <p className="text-2xl tracking-tight leading-snug font-light md:text-4xl">
          Fumadocs is a <span className="text-brand font-medium">React.js</span>{' '}
          documentation framework for{' '}
          <span className="text-brand font-medium">Developers</span>,
          beautifully designed by{' '}
          <span className="text-brand font-medium">Fuma Nama</span>. Bringing
          powerful features for your docs workflows, with high customizability
          to fit your preferences, works seamlessly with any React.js framework,
          CMS — anything.
        </p>
        <div className="my-24 p-8 bg-gradient-to-b from-brand-secondary/40 rounded-xl">
          <h2 className="text-6xl text-center mix-blend-overlay font-tinos">
            Try it out.
          </h2>
          <CodeBlock
            code="pnpm create fumadocs-app"
            lang="bash"
            wrapper={{
              className: 'mx-auto w-full max-w-[800px]',
            }}
          />
          <CreateAppAnimation />
        </div>
        <Feedback />
        <div className="grid grid-cols-1 my-24 lg:grid-cols-2">
          <PreviewImages />
          <div>
            <h2 className="text-4xl font-tinos my-2">
              Minimal aesthetics, with maximum customizability.
            </h2>
            <p>
              Fumadocs offer well-designed themes, with a headless mode to plug
              your own UI.
              <br />
              Pro designer? Customise it with a single command using Fumadocs
              CLI.
            </p>
            <CodeBlock
              code="pnpm dlx @fumadocs/cli customise"
              lang="bash"
              wrapper={{ className: 'mt-4' }}
            />
          </div>
        </div>
        <Writing
          tabs={{
            writer: (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <CodeBlock
                  code={`---
title: Hello World
---

## Overview

I love **Fumadocs**!

\`\`\`ts tab="Tab 1"
console.log("Hello World")
\`\`\`

\`\`\`ts tab="Tab 2"
return 0;
\`\`\``}
                  lang="mdx"
                />
                <div>
                  <h3 className="text-3xl font-tinos mb-4">
                    The familiar syntax.
                  </h3>
                  <p>
                    It is just Markdown, with additional features seamlessly
                    composing into the syntax.
                  </p>
                  <ul className="text-xs list-disc list-inside mt-8">
                    <li>Markdown features, including images</li>
                    <li>Syntax highlighting (Powered by Shiki)</li>
                    <li>Codeblock Groups</li>
                    <li>Callouts</li>
                    <li>Cards</li>
                    <li>Custom Heading Anchors</li>
                    <li>Auto Table of Contents</li>
                  </ul>
                </div>
              </div>
            ),
            developer: (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <CodeBlock
                  code={`---
title: Hello World
---

import { Playground } from "@/components/playground";

## Overview

<Playground title="Test" />

This codeblock shows TypeScript information!

\`\`\`ts twoslash
console.log("Hello World");

// give your code decorations [!code ++]
const name = "fumadocs";
\`\`\`

And re-use content:

<include>./another-page.mdx</include>`}
                  lang="mdx"
                />
                <div>
                  <h3 className="text-3xl font-tinos mb-4">
                    Extensive but simple.
                  </h3>
                  <p>MDX-native for developers authoring content.</p>
                  <ul className="text-xs list-disc list-inside mt-8">
                    <li>JavaScript + JSX syntax</li>
                    <li>Custom Components</li>
                    <li>Include/Embed Content</li>
                    <li>Twoslash Integration</li>
                    <li>Shiki Notations</li>
                    <li>Extend via remark, rehype plugins</li>
                  </ul>
                </div>
              </div>
            ),
            automation: (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <CodeBlock
                  code={`---
title: Hello World
---

import { db } from "@/lib/db";

export async function DataView() {
  const products = await db.select().from("products");
  return products.map(product => <div key={product.id}>{product.name}</div>)
}

<DataView />

<auto-type-table path='./my-file.ts' name='CardProps' />`}
                  lang="mdx"
                />

                <div>
                  <h3 className="text-3xl font-tinos mb-4">
                    Content, always up-to-date.
                  </h3>
                  <p>
                    Combining the power of MDX and React Server Components, use
                    the latest data from database, server — anywhere, to be part
                    of your content.
                  </p>
                  <ul className="text-xs list-disc list-inside mt-8">
                    <li>Works on React Server Components</li>
                    <li>Display data from database, CMS, anything</li>
                    <li>
                      auto-type-table for documenting types based on TypeScript
                      Compiler
                    </li>
                    <li>OpenAPI playground for documenting your APIs</li>
                  </ul>
                </div>
              </div>
            ),
          }}
        />
        <div className="grid grid-cols-1 items-center my-24 lg:grid-cols-2">
          <Image
            src={ComponentsImage}
            alt="components"
            width={1000}
            className="min-w-0"
          />
          <div>
            <h1 className="font-tinos text-4xl mb-8">
              Composable & Flexible, by a Engineer.
            </h1>
            <p>
              Separated as <span className="text-brand">Content</span> →{' '}
              <span className="text-brand">Core</span> →{' '}
              <span className="text-brand">UI</span>, offering the high
              composability that engineers love — you can use Fumadocs MDX as a
              library, without adapting the entire framework.
            </p>
            <div className="text-sm mt-8 [mask-image:linear-gradient(to_bottom,white,transparent)]">
              <p>fumadocs</p>
              <p>fumadocs-mdx</p>
              <p>fumadocs-core</p>
              <p>fumadocs-ui</p>
              <p>fumadocs-openapi</p>
              <p>fumadocs-obsidian</p>
            </div>
          </div>
        </div>
        <Features />
      </div>
      <Footer />
    </main>
  );
}
const feedback = [
  {
    avatar: 'https://avatars.githubusercontent.com/u/124599',
    user: 'shadcn',
    role: 'Creator of Shadcn UI',
    message: `You know how you end up rebuilding a full docs site every time you start a new project? 

Fumadocs fixes this by giving you all the right blocks that you compose together.

Like headless docs to build exactly what you need.`,
  },
  {
    avatar: 'https://avatars.githubusercontent.com/u/35677084',
    user: 'Anthony Shew',
    role: 'Turbo DX at Vercel',
    message: `Major shoutout to @fuma_nama for making fumadocs, a gorgeous documentation framework that composes beautifully into the App Router.`,
  },
  {
    user: 'Aiden Bai',
    avatar: 'https://avatars.githubusercontent.com/u/38025074',
    role: 'Creator of Million.js',
    message: 'fumadocs is the best Next.js docs framework',
  },
  {
    avatar: 'https://avatars.githubusercontent.com/u/10645823',
    user: 'David Blass',
    role: 'Creator of Arktype',
    message: `I'd have no shot building @arktypeio docs that looked half this good without it 😍`,
  },
];

function Feedback() {
  return (
    <div className="grid grid-cols-1 my-24 lg:grid-cols-2">
      <div>
        <h2 className="text-4xl mb-8 font-tinos">A framework people loves.</h2>
        <p>
          Loved by teams and developers from startups like Unkey, Vercel, Orama
          — evolving everyday to be your favourite docs framework.
        </p>
        <Link
          href="/showcase"
          className={cn(
            buttonVariants({
              className: 'mt-4',
            }),
          )}
        >
          Showcase
        </Link>
      </div>
      <Marquee className="[mask-image:linear-gradient(to_right,transparent,white_20px,white_calc(100%-20px),transparent)]">
        {feedback.map((item) => (
          <div
            key={item.user}
            className="flex flex-col rounded-xl border bg-gradient-to-b from-fd-card p-4 shadow-lg w-[320px]"
          >
            <p className="text-sm whitespace-pre-wrap">{item.message}</p>

            <div className="mt-auto flex flex-row items-center gap-2 pt-4">
              <Image
                src={item.avatar}
                alt="avatar"
                width="32"
                height="32"
                unoptimized
                className="size-8 rounded-full"
              />
              <div>
                <p className="text-sm font-medium">{item.user}</p>
                <p className="text-xs text-fd-muted-foreground">{item.role}</p>
              </div>
            </div>
          </div>
        ))}
      </Marquee>
    </div>
  );
}

function Features() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Feature
        icon={PaperclipIcon}
        subheading="Source Agnostic"
        heading="Your source. Your choice"
        description={
          <>
            <span className="font-medium text-fd-foreground">
              Designed to integrate with any content source:{' '}
            </span>
            <span>
              Fumadocs works on MDX, Content Collections, and even your own CMS.
            </span>
          </>
        }
        className="overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle at 60% 50%,var(--color-fd-secondary),var(--color-fd-background) 80%)',
        }}
      >
        <div className="mt-8 flex flex-col">
          <div className="flex flex-row w-fit items-center gap-4">
            <a
              href="https://github.com/fuma-nama/fumadocs-basehub"
              rel="noreferrer noopener"
              target="_blank"
              className={cn(linkVariants())}
            >
              BaseHub CMS
            </a>
            <a
              href="https://github.com/fuma-nama/fumadocs-sanity"
              rel="noreferrer noopener"
              target="_blank"
              className={cn(linkVariants())}
            >
              Sanity
            </a>
            <a
              href="https://github.com/MFarabi619/fumadocs-payloadcms"
              rel="noreferrer noopener"
              target="_blank"
              className={cn(linkVariants())}
            >
              Payload CMS
            </a>
          </div>
          <Image
            alt="Source"
            src={SourceImage}
            sizes="600px"
            className="-mt-16 w-[400px] min-w-[400px] invert pointer-events-none dark:invert-0"
          />
          <div className="z-2 mt-[-170px] w-[300px] overflow-hidden rounded-lg border border-fd-foreground/10 shadow-xl backdrop-blur-lg">
            <div className="flex flex-row items-center gap-2 bg-fd-muted/50 px-4 py-2 text-xs font-medium text-fd-muted-foreground">
              <FileEditIcon className="size-4" />
              MDX Editor
            </div>
            <pre className="p-4 text-[13px]">
              <code className="grid">
                <span className="font-medium"># Hello World!</span>
                <span>This is my first document.</span>
                <span>{` `}</span>
                <span className="font-medium">{`<ServerComponent />`}</span>
              </code>
            </pre>
          </div>
        </div>
      </Feature>
      <Feature
        icon={SearchIcon}
        subheading="Search Integration"
        heading="Enhance your search experience."
        description="Integrate with Orama Search and Algolia Search in your docs easily."
      >
        <Link
          href="/docs/headless/search/algolia"
          className={cn(buttonVariants({ className: 'mt-4' }))}
        >
          Learn More
        </Link>
        <Search />
      </Feature>
      <Feature
        icon={Terminal}
        subheading="Fumadocs CLI"
        heading="The Shadcn UI for docs"
        description="Fumadocs CLI creates interactive components for your docs, offering a rich experience to your users."
      >
        <div className="relative">
          <div className="grid grid-cols-[1fr_2fr_1fr] h-[220px] *:border-fd-foreground/50 *:border-dashed mask-radial-circle mask-radial-from-white">
            <div className="border-r border-b" />
            <div className="border-b" />
            <div className="border-l border-b" />

            <div className="border-r" />
            <div className="w-[200px]" />
            <div className="border-l" />

            <div className="border-r border-t" />
            <div className="border-t" />
            <div className="border-l border-t" />
          </div>
          <code className="absolute inset-0 flex items-center justify-center">
            <code className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-fd-foreground font-medium">
              npx @fumadocs/cli add
            </code>
          </code>
        </div>
      </Feature>
      <Feature
        icon={CpuIcon}
        subheading="Robust"
        heading="Flexibility that cover your needs."
        description="Well documented, separated in packages."
      >
        <div className="mt-8 flex flex-col gap-4">
          <Link
            href="/docs/ui"
            className="rounded-xl bg-gradient-to-br from-transparent via-fd-primary p-px shadow-lg shadow-fd-primary/20"
          >
            <div className="rounded-[inherit] bg-fd-background bg-gradient-to-br from-transparent via-fd-primary/10 p-4 transition-colors hover:bg-fd-muted">
              <LayoutIcon />
              <h3 className="font-semibold">Fumadocs UI</h3>
              <p className="text-sm text-fd-muted-foreground">
                Default theme of Fumadocs with many useful components.
              </p>
            </div>
          </Link>
          <Link
            href="/docs/headless"
            className="rounded-xl border bg-fd-background p-4 shadow-lg transition-colors hover:bg-fd-muted"
          >
            <LibraryIcon />
            <h3 className="font-semibold">Core</h3>
            <p className="text-sm text-fd-muted-foreground">
              Headless library with a useful set of utilities.
            </p>
          </Link>
        </div>
      </Feature>
    </div>
  );
}

const searchItemVariants = cva(
  'flex flex-row items-center gap-2 rounded-md p-2 text-sm text-fd-popover-foreground',
);

function Search() {
  return (
    <div className="mt-6 rounded-lg bg-gradient-to-b from-fd-border p-px">
      <div className="flex select-none flex-col rounded-[inherit] bg-gradient-to-b from-fd-popover">
        <div className="inline-flex items-center gap-2 px-4 py-2 text-sm text-fd-muted-foreground">
          <SearchIcon className="size-4" />
          Search...
        </div>
        <div className="border-t p-2">
          {[
            'Getting Started',
            'Components',
            'MDX Content',
            'User Guide',
            'Javascript SDK',
          ].map((v, i) => (
            <div
              key={v}
              className={cn(
                searchItemVariants({
                  className: i === 0 ? 'bg-fd-accent' : '',
                }),
              )}
            >
              <FileTextIcon className="size-4 text-fd-muted-foreground" />
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Feature({
  className,
  icon: Icon,
  heading,
  subheading,
  description,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  icon: LucideIcon;
  subheading: ReactNode;
  heading: ReactNode;
  description: ReactNode;
}) {
  return (
    <div
      className={cn('p-8 rounded-xl overflow-hidden border', className)}
      {...props}
    >
      <div className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-fd-muted-foreground">
        <Icon className="size-4" />
        <p>{subheading}</p>
      </div>
      <h2 className="mb-2 text-lg font-semibold">{heading}</h2>
      <p className="text-fd-muted-foreground">{description}</p>

      {props.children}
    </div>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col items-center mt-20 bg-brand-secondary py-12 text-brand-secondary-foreground rounded-full">
      <p className="mb-1 text-3xl font-semibold">Fumadocs</p>
      <p className="text-xs">
        Built with <HeartIcon className="inline size-4" /> by{' '}
        <a
          href="https://fuma-dev.vercel.app"
          rel="noreferrer noopener"
          target="_blank"
          className="font-medium"
        >
          Fuma
        </a>
      </p>
    </footer>
  );
}
