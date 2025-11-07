import Image from 'next/image';
import { Tinos } from 'next/font/google';
import { cn } from '@/lib/cn';
import Link from 'next/link';
import ComponentsImage from './components.png';
import ContentImage from './content.png';
import { cva } from 'class-variance-authority';
import {
  BatteryChargingIcon,
  FileTextIcon,
  Heart,
  HeartIcon,
  SearchIcon,
  TimerIcon,
} from 'lucide-react';
import { Marquee } from '@/app/(home)/marquee';
import { CodeBlock } from '@/components/code-block';
import {
  CreateAppAnimation,
  PreviewImages,
  Writing,
} from '@/app/(home)/page.client';
import ShadcnImage from './shadcn.png';
import ContributorCounter from '@/components/contributor-count';
import { owner, repo } from '@/lib/github';
import { Hero } from './hero';

const tinos = Tinos({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-tinos',
});

const headingVariants = cva('font-tinos', {
  variants: {
    variant: {
      h2: 'text-3xl lg:text-4xl',
      h3: 'text-3xl',
    },
  },
});

const buttonVariants = cva(
  'inline-flex justify-center px-5 py-3 rounded-full font-medium tracking-tight transition-colors',
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

const cardVariants = cva('rounded-2xl text-sm p-6 bg-origin-border shadow-lg', {
  variants: {
    variant: {
      brand: 'bg-brand text-brand-foreground',
      secondary: 'bg-brand-secondary text-brand-secondary-foreground',
      default: 'border bg-fd-card',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export default function Page() {
  return (
    <main
      className={cn(
        'text-landing-foreground dark:text-landing-foreground-dark',
        tinos.variable,
      )}
    >
      <div className="relative flex min-h-[600px] h-[70vh] max-h-[900px] border rounded-2xl overflow-hidden mx-auto w-full max-w-[1400px] bg-origin-border">
        <Hero />
        <div className="z-2 p-6 size-full md:p-12">
          <p className="mt-12 text-xs text-brand font-medium rounded-full p-2 border border-brand w-fit">
            the React.js docs framework you love.
          </p>
          <h1 className="text-4xl mt-4 mb-12 leading-tighter font-medium lg:text-5xl">
            Build excellent documentations,
            <br />
            your <span className="text-brand">style</span>.
          </h1>
          <div className="flex flex-col text-center w-fit gap-4 md:flex-row md:items-center">
            <Link href="/docs/ui" className={cn(buttonVariants())}>
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
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 mt-12 px-6 pb-6 mx-auto w-full max-w-[1400px] md:px-12 md:pb-12 lg:grid-cols-2">
        <p className="text-2xl tracking-tight leading-snug font-light col-span-full md:text-4xl">
          Fumadocs is a <span className="text-brand font-medium">React.js</span>{' '}
          documentation framework for{' '}
          <span className="text-brand font-medium">Developers</span>,
          beautifully designed by{' '}
          <span className="text-brand font-medium">Fuma Nama</span>. Bringing
          powerful features for your docs workflows, with high customizability
          to fit your preferences, works seamlessly with any React.js framework,
          CMS — anything.
        </p>
        <div className="p-8 bg-gradient-to-b from-brand-secondary/40 rounded-xl col-span-full">
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
        <Aesthetics />
        <AnybodyCanWrite />
        <ForEngineers />
        <OpenSource />
        <Footer />
      </div>
    </main>
  );
}

function Aesthetics() {
  return (
    <>
      <div
        className={cn(
          cardVariants({
            variant: 'brand',
            className:
              'flex items-center justify-center p-0 row-span-2 max-lg:row-start-6',
          }),
        )}
      >
        <PreviewImages />
      </div>
      <div className={cn(cardVariants())}>
        <h3
          className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}
        >
          Minimal aesthetics, Maximum customizability.
        </h3>
        <p>
          Fumadocs offer well-designed themes, with a headless mode to plug your
          own UI.
        </p>
      </div>
      <div className={cn(cardVariants({ className: 'flex flex-col' }))}>
        <p className="mb-4">
          Pro designer? Customise the theme using Fumadocs CLI.
        </p>
        <CodeBlock
          code={`pnpm dlx @fumadocs/cli customise\n\n> Choose a layout to customise...`}
          lang="bash"
        />
      </div>
    </>
  );
}

function AnybodyCanWrite() {
  return (
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
            <div className="max-lg:row-start-1">
              <h3
                className={cn(
                  headingVariants({ variant: 'h3', className: 'my-4' }),
                )}
              >
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
            <div className="max-lg:row-start-1">
              <h3
                className={cn(
                  headingVariants({ variant: 'h3', className: 'my-4' }),
                )}
              >
                Extensive but simple.
              </h3>
              <p>
                MDX for developers authoring content, use JavaScript in content.
              </p>
              <ul className="text-xs list-disc list-inside mt-8">
                <li>JavaScript + JSX syntax</li>
                <li>Custom Components</li>
                <li>Include/Embed Content</li>
                <li>
                  TypeScript Twoslash: show type information in codeblocks.
                </li>
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

            <div className="max-lg:row-start-1">
              <h3
                className={cn(
                  headingVariants({ variant: 'h3', className: 'my-4' }),
                )}
              >
                Content, always up-to-date.
              </h3>
              <p>
                Combining the power of MDX and React Server Components, use the
                latest data from database, server — anywhere, to be part of your
                content.
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
    <>
      <div className={cn(cardVariants())}>
        <h3
          className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}
        >
          A framework people love.
        </h3>
        <p className="mb-6">
          Loved by teams and developers from startups like Unkey, Vercel, Orama
          — evolving everyday to be your favourite docs framework.
        </p>
        <Link href="/showcase" className={cn(buttonVariants())}>
          Showcase
        </Link>
      </div>
      <div
        className={cn(
          cardVariants({
            variant: 'brand',
            className: 'relative p-0',
          }),
        )}
      >
        <div className="absolute inset-0 z-2 inset-shadow-[0_10px_60px] inset-shadow-brand rounded-2xl" />
        <Marquee className="p-8">
          {feedback.map((item) => (
            <div
              key={item.user}
              className="flex flex-col rounded-xl border bg-fd-card text-landing-foreground p-4 shadow-lg w-[320px]"
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
                  <p className="text-xs text-fd-muted-foreground">
                    {item.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </Marquee>
      </div>
    </>
  );
}

function ForEngineers() {
  return (
    <>
      <h2
        className={cn(
          headingVariants({
            variant: 'h2',
            className: 'text-brand text-center mb-8 col-span-full',
          }),
        )}
      >
        Docs For Engineers.
      </h2>
      <div className="grid grid-cols-subgrid gap-4">
        <Image
          src={ComponentsImage}
          alt="Framework Agnostic"
          width={1200}
          className="min-w-0 rounded-2xl object-cover pointer-events-none shadow-lg"
        />
        <div className={cn(cardVariants())}>
          <h3
            className={cn(
              headingVariants({
                variant: 'h3',
                className: 'mb-6',
              }),
            )}
          >
            Framework Agnostic
          </h3>
          <p>
            Official support for Next.js, Tanstack Start, React Router, Waku —
            portable to any React.js framework.
          </p>
        </div>
      </div>
      <div
        className={cn(
          cardVariants({
            className: 'flex flex-col',
          }),
        )}
      >
        <h3
          className={cn(headingVariants({ variant: 'h3', className: 'mb-8' }))}
        >
          A truly composable framework.
        </h3>
        <p className="mb-8">
          Separated as <span className="text-brand">Content</span> →{' '}
          <span className="text-brand">Core</span> →{' '}
          <span className="text-brand">UI</span>, offering the high
          composability that engineers love — you can use Fumadocs as a library,
          without adapting the entire framework.
        </p>
        <div className="mt-auto flex flex-col gap-2 @container mask-[linear-gradient(to_bottom,white,transparent)]">
          {[
            {
              name: 'fumadocs-mdx',
              description: 'Use MDX in your React framework elegantly.',
            },
            {
              name: 'fumadocs-core',
              description:
                'Headless library for building docs + handling content.',
            },
            {
              name: 'fumadocs-ui',
              description: 'UI library for building docs.',
            },
            {
              name: 'fumadocs-openapi',
              description: 'Extend Fumadocs to render OpenAPI docs.',
            },
            {
              name: 'fumadocs-obsidian',
              description: 'Extend Fumadocs to handle Obsidian-style Markdown.',
            },
          ].map((item) => (
            <div
              key={item.name}
              className="flex flex-col text-sm gap-2 p-2 border border-dashed border-neutral-300 @lg:flex-row @lg:items-center"
            >
              <p className="font-medium text-nowrap">{item.name}</p>
              <p className="text-xs flex-1 @lg:text-end">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={cn(cardVariants())}>
        <h3
          className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}
        >
          Adopts your content.
        </h3>
        <p className="mb-4">
          Designed to integrate with any{' '}
          <span className="text-brand">content source</span>, Fumadocs works on
          MDX, Content Collections, and even your own CMS.
        </p>
        <div className="flex flex-row w-fit items-center gap-4 mb-6">
          {[
            {
              href: 'https://github.com/fuma-nama/fumadocs-basehub',
              text: 'BaseHub CMS',
            },
            {
              href: 'https://github.com/fuma-nama/fumadocs-sanity',
              text: 'Sanity',
            },
            {
              href: 'https://github.com/MFarabi619/fumadocs-payloadcms',
              text: 'Payload CMS',
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              rel="noreferrer noopener"
              target="_blank"
              className="text-sm text-brand hover:underline"
            >
              {item.text}
            </a>
          ))}
        </div>
        <CodeBlock
          wrapper={{
            title: 'Fumadocs MDX',
          }}
          code={`
import { loader } from 'fumadocs-core/source';
import { docs } from '@/.source';

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
});`.trim()}
          lang="ts"
        />
      </div>
      <Image
        alt="Content Integration"
        src={ContentImage}
        width={1200}
        className="min-w-0 rounded-2xl object-cover pointer-events-none shadow-lg"
      />
      <div className={cn(cardVariants(), 'flex flex-col row-span-2')}>
        <SearchIcon className="size-8 mb-4 text-brand" />
        <h3
          className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}
        >
          Enhance your search experience.
        </h3>
        <p className="mb-6">
          Integrate with Orama Search and Algolia Search in your docs easily.
        </p>
        <Link
          href="/docs/headless/search/algolia"
          className={cn(buttonVariants({ className: 'w-fit mb-8' }))}
        >
          Learn More
        </Link>
        <Search />
      </div>
      <div className={cn(cardVariants())}>
        <h3
          className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}
        >
          The shadcn/ui for docs
        </h3>
        <p>
          Fumadocs CLI creates interactive components for your docs, offering a
          rich experience to your users.
        </p>
      </div>
      <Image src={ShadcnImage} alt="shadcn" className="rounded-2xl" />
    </>
  );
}

const searchItemVariants = cva(
  'rounded-md p-2 text-sm text-fd-popover-foreground',
);

function Search() {
  return (
    <div className="flex select-none flex-col mt-auto bg-fd-popover rounded-xl border mask-[linear-gradient(to_bottom,white_40%,transparent_90%)] max-md:-mx-4">
      <div className="inline-flex items-center gap-2 px-4 py-3 text-sm text-fd-muted-foreground">
        <SearchIcon className="size-4" />
        Search...
      </div>
      <div className="border-t p-2">
        {[
          ['Getting Started', 'Use Fumadocs in your project.'],
          ['Components', 'The UI Components for your docs.'],
          ['MDX Content', 'Using MDX for content.'],
          ['User Guide', 'How to use Fumadocs.'],
        ].map(([title, description], i) => (
          <div
            key={i}
            className={cn(
              searchItemVariants({
                className: i === 0 && 'bg-fd-accent',
              }),
            )}
          >
            <div className="flex flex-row items-center gap-2">
              <FileTextIcon className="size-4 text-fd-muted-foreground" />
              <p>{title}</p>
              {i === 7 && (
                <p className="ms-auto text-xs text-fd-muted-foreground">Open</p>
              )}
            </div>
            <p className="text-xs mt-2 text-fd-muted-foreground ps-6">
              {description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col justify-center items-center bg-brand-secondary py-12 text-brand-secondary-foreground rounded-2xl">
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

function OpenSource() {
  return (
    <>
      <h2
        className={cn(
          headingVariants({
            variant: 'h2',
            className: 'mt-8 text-brand text-center mb-8 col-span-full',
          }),
        )}
      >
        A Framework of Dream.
      </h2>

      <div className={cn(cardVariants({ className: 'flex flex-col' }))}>
        <Heart fill="currentColor" className="text-pink-500 mb-4" />
        <h3
          className={cn(
            headingVariants({
              variant: 'h3',
              className: 'mb-6',
            }),
          )}
        >
          Made Possible by You.
        </h3>
        <p className="mb-8">
          Fumadocs is 100% powered by passion and open source community.
        </p>
        <div className="mb-8 flex flex-row items-center gap-2">
          <Link
            href="/sponsors"
            className={cn(buttonVariants({ variant: 'primary' }))}
          >
            Sponsors
          </Link>
          <a
            href="https://github.com/fuma-nama/fumadocs/graphs/contributors"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ variant: 'secondary' }))}
          >
            Contributors
          </a>
        </div>
        <ContributorCounter repoOwner={owner} repoName={repo} />
      </div>
      <div
        className={cn(
          cardVariants({
            className: 'flex flex-col p-0 pt-8',
          }),
        )}
      >
        <h2 className="text-3xl text-center font-extrabold font-mono uppercase mb-4 lg:text-4xl">
          Build Your Docs
        </h2>
        <p className="text-center font-mono text-xs opacity-50 mb-8">
          light and gorgeous, just like the moon.
        </p>
        <div className="h-[200px] mt-auto overflow-hidden p-8 bg-gradient-to-b from-fd-primary/10">
          <div className="mx-auto bg-radial-[circle_at_0%_100%] from-60% from-transparent to-fd-primary size-[500px] rounded-full" />
        </div>
      </div>

      <ul
        className={cn(
          cardVariants({
            className: 'flex flex-col gap-6',
          }),
        )}
      >
        <li>
          <span className="flex flex-row items-center gap-2 font-medium">
            <BatteryChargingIcon className="size-5" />
            Battery guaranteed.
          </span>
          <span className="mt-2 text-sm text-fd-muted-foreground">
            Actively maintained, open for contributions.
          </span>
        </li>
        <li>
          <span className="flex flex-row items-center gap-2 font-medium">
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            Fully open-source.
          </span>
          <span className="mt-2 text-sm text-fd-muted-foreground">
            Open source, available on Github.
          </span>
        </li>
        <li>
          <span className="flex flex-row items-center gap-2 font-medium">
            <TimerIcon className="size-5" />
            Within seconds.
          </span>
          <span className="mt-2 text-sm text-fd-muted-foreground">
            Initialize a new project instantly with CLI.
          </span>
        </li>
        <li className="flex flex-row flex-wrap gap-2 mt-auto">
          <Link href="/docs/ui" className={cn(buttonVariants())}>
            Read docs
          </Link>
          <a
            href="https://github.com/fuma-nama/fumadocs"
            rel="noreferrer noopener"
            className={cn(
              buttonVariants({
                variant: 'secondary',
              }),
            )}
          >
            Open GitHub
          </a>
        </li>
      </ul>
    </>
  );
}
