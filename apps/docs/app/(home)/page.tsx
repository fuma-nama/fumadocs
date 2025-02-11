import { cva } from 'class-variance-authority';
import { Heart, type LucideIcon, MousePointer, Terminal } from 'lucide-react';
import {
  BatteryChargingIcon,
  CpuIcon,
  FileEditIcon,
  FileTextIcon,
  KeyboardIcon,
  LayoutIcon,
  LibraryIcon,
  PaperclipIcon,
  PersonStandingIcon,
  RocketIcon,
  SearchIcon,
  TimerIcon,
} from 'lucide-react';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import { CodeBlock } from '@/components/code-block';
import { UwuHero } from '@/app/(home)/uwu';
import SourceImage from '@/public/source.png';
import ContributorCounter from '@/components/contributor-count';
import {
  CreateAppAnimation,
  PreviewImages,
  WhyInteractive,
} from './page.client';
import { VercelLogo, NetlifyLogo, NextSVG, OpenAPIIcon } from './icons';
import ArchImg from './arch.png';
import { TypeTable } from 'fumadocs-ui/components/type-table';

const badgeVariants = cva(
  'inline-flex size-7 items-center justify-center rounded-full bg-fd-primary font-medium text-fd-primary-foreground',
);

export default function Page() {
  const gridColor =
    'color-mix(in oklab, var(--color-fd-primary) 10%, transparent)';

  return (
    <>
      <div
        className="absolute inset-x-0 top-[360px] h-[250px] max-md:hidden"
        style={{
          background: `repeating-linear-gradient(to right, ${gridColor}, ${gridColor} 1px,transparent 1px,transparent 50px), repeating-linear-gradient(to bottom, ${gridColor}, ${gridColor} 1px,transparent 1px,transparent 50px)`,
        }}
      />
      <main className="container relative max-w-[1100px] px-2 py-4 z-[2] lg:py-8">
        <div
          style={{
            background:
              'repeating-linear-gradient(to bottom, transparent, color-mix(in oklab, var(--color-fd-primary) 1%, transparent) 500px, transparent 1000px)',
          }}
        >
          <div className="relative">
            <Hero />
            <UwuHero />
          </div>
          <Feedback />
          <Introduction />
          <Architecture />
          <div
            className="relative overflow-hidden border-x border-t px-8 py-16 sm:py-24"
            style={{
              backgroundImage:
                'radial-gradient(circle at center, var(--color-fd-secondary), var(--color-fd-background) 40%)',
            }}
          >
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">
              Loved by users.
              <br />
              Built for developers.
            </h2>
          </div>
          <Features />
          <Highlights />
          <Why />
          <Contributing />
          <End />
        </div>
      </main>
    </>
  );
}

function Architecture() {
  return (
    <div className="flex flex-col gap-4 border-x border-t px-8 py-16 md:py-24 lg:flex-row md:px-16">
      <div className="shrink-0 flex-1 font-mono text-start">
        <p className="px-2 py-1 text-sm bg-fd-primary text-fd-primary-foreground font-medium w-fit mb-4">
          Designed with Love
        </p>
        <h2 className="text-xl font-medium mb-4 sm:text-2xl">
          One framework to solve three problems.
        </h2>
        <p className="text-sm text-fd-muted-foreground mb-6">
          Fumadocs makes it easy to build beautiful docs, and bring the power to
          transform content into data, on Next.js.
          <br />
          Every part is handled with love - incredibly flexible and
          customisable.
        </p>
        <div className="flex flex-row items-center -mx-4">
          <a
            href="https://github.com/fuma-nama/fumadocs-basehub"
            rel="noreferrer noopener"
            target="_blank"
            className={cn(buttonVariants({ variant: 'link' }))}
          >
            BaseHub CMS example
          </a>
          <a
            href="https://github.com/fuma-nama/fumadocs-sanity"
            rel="noreferrer noopener"
            target="_blank"
            className={cn(buttonVariants({ variant: 'link' }))}
          >
            Sanity example
          </a>
        </div>
      </div>
      <Image
        src={ArchImg}
        alt="Architecture"
        className="md:-mt-20 ms-auto w-full max-w-[450px] invert dark:invert-0"
      />
    </div>
  );
}

async function Why() {
  return (
    <div className="relative overflow-hidden border-x border-t px-8 py-12 md:p-16 md:min-h-[700px]">
      <p className="text-center font-medium text-fd-muted-foreground">
        Fumadocs offers a complete toolchain to build and maintain your docs.
      </p>
      <WhyInteractive
        typeTable={
          <TypeTable
            type={{
              name: {
                type: 'string',
                description: 'The name of player',
                default: 'hello',
              },
              code: {
                type: 'string',
                description: (
                  <CodeBlock lang="ts" code='console.log("Hello World")' />
                ),
              },
            }}
          />
        }
        codeblockSearchRouter={
          <CodeBlock
            lang="ts"
            code={`import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
 
export const { GET } = createFromSource(source);`}
          />
        }
        codeblockTheme={
          <CodeBlock
            lang="css"
            code={`@import 'tailwindcss';
@import 'fumadocs-ui/css/neutral.css';
@import 'fumadocs-ui/css/preset.css';

@source '../node_modules/fumadocs-ui/dist/**/*.js';`}
          />
        }
        codeblockInteractive={
          <CodeBlock
            lang="tsx"
            code={`import { File, Folder, Files } from 'fumadocs-ui/components/files';
 
<Files>
  <Folder name="app" defaultOpen>
    <File name="layout.tsx" />
    <File name="page.tsx" />
    <File name="global.css" />
  </Folder>
  <File name="package.json" />
</Files>`}
          />
        }
        codeblockMdx={
          <CodeBlock
            lang="tsx"
            code={`import { db } from '@/server/db';

export function ProductTable() {
  const products = db.getProducts()
    
  return (
    <ul>
      {products.map(product => <li key={product.key}>{product.name}</li>)}
    </ul>
  );
}

## Products

<ProductTable />`}
          />
        }
      />
    </div>
  );
}

function End() {
  return (
    <div className="grid grid-cols-1 border-b border-r md:grid-cols-2 lg:grid-cols-3">
      <div className="relative flex flex-col gap-8 overflow-hidden border-l border-t px-8 py-14">
        <h2 className="text-3xl font-bold font-mono uppercase text-fd-muted-foreground">
          Build Your Docs
        </h2>
        <ul className="mt-4 flex flex-col gap-6">
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
        </ul>
        <div className="flex flex-row flex-wrap gap-2 border-t pt-8">
          <Link href="/docs" className={cn(buttonVariants())}>
            Read docs
          </Link>
          <a
            href="https://githubbox.com/fuma-nama/fumadocs-ui-template"
            rel="noreferrer noopener"
            className={cn(
              buttonVariants({
                variant: 'outline',
              }),
            )}
          >
            Open in CodeSandbox
          </a>
        </div>
      </div>
      <Integration className="border-t lg:col-span-2" />
    </div>
  );
}

const linkItemVariants = cva('transition-colors hover:bg-fd-muted');

function Integration({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className={cn(
        'relative grid grid-cols-1 *:border-l *:border-t *:p-6 lg:grid-cols-3',
        className,
      )}
      {...props}
    >
      <Link href="/docs/ui/openapi" className={cn(linkItemVariants())}>
        <OpenAPIIcon className="mb-2 size-12" />
        <p className="text-lg font-medium">OpenAPI</p>
        <p className="text-sm text-fd-muted-foreground">
          Generate docs from your OpenAPI schema.
        </p>
      </Link>
      <Link href="/docs/mdx" className={cn(linkItemVariants())}>
        <NextSVG className="mb-2 size-12" />
        <p className="text-lg font-medium">Next.js</p>
        <p className="text-sm text-fd-muted-foreground">
          Enjoy the full power of App Router.
        </p>
      </Link>
      <Link
        href="/docs/headless/content-collections"
        className={cn(linkItemVariants())}
      >
        <Image
          alt="Content Collections logo"
          src="/content-collections.webp"
          className="mb-2 grayscale"
          width={48}
          height={48}
        />
        <p className="text-lg font-medium">Content Collections</p>
        <p className="text-sm text-fd-muted-foreground">
          Integrate with Content Collections, an alternative to Contentlayer.
        </p>
      </Link>
      <div className="col-span-full">
        <p className="text-sm font-medium">Available now</p>
        <CodeBlock
          wrapper={{ className: 'mt-2' }}
          lang="bash"
          code="pnpm create fumadocs-app"
        />
      </div>
      <div className="col-span-full h-[200px] overflow-hidden bg-gradient-to-b from-fd-primary/10">
        <div
          className="mx-auto size-[500px] rounded-full"
          style={{
            backgroundImage:
              'radial-gradient(circle at 0% 100%, transparent 60%, var(--color-fd-primary))',
          }}
        />
      </div>
    </div>
  );
}

const searchItemVariants = cva(
  'flex flex-row items-center gap-2 rounded-md p-2 text-sm text-fd-popover-foreground',
);

function Search(): React.ReactElement {
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

function Highlights(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 border-r md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-full flex flex-row items-start justify-center border-l border-t p-8 pb-2 text-center">
        <h2 className="bg-fd-primary text-fd-primary-foreground px-1 text-2xl font-semibold">
          Highlights
        </h2>
        <MousePointer className="-ml-1 mt-8" />
      </div>
      <Highlight icon={RocketIcon} heading="Light and Fast.">
        Powerful documentation site with Next.js App Router.
      </Highlight>
      <Highlight icon={TimerIcon} heading="Performance.">
        Less client components, less Javascript, optimized images.
      </Highlight>
      <Highlight icon={LayoutIcon} heading="Accessibility & UX first.">
        Focus on user experience and accessibility.
      </Highlight>
      <Highlight icon={SearchIcon} heading="Syntax Highlighting.">
        Beautiful syntax highlighter, powered by{' '}
        <a href="https://shiki.style" rel="noreferrer noopener">
          Shiki
        </a>
        .
      </Highlight>
      <Highlight icon={KeyboardIcon} heading="Automation.">
        Useful remark/rehype plugins. Typescript Twoslash, OpenAPI docs
        generation, and more.
      </Highlight>
      <Highlight icon={PersonStandingIcon} heading="Personalized.">
        Advanced options for customising your theme in a comfortable way.
      </Highlight>
    </div>
  );
}

function Highlight({
  icon: Icon,
  heading,
  children,
}: {
  icon: LucideIcon;
  heading: ReactNode;
  children: ReactNode;
}): React.ReactElement {
  return (
    <div className="border-l border-t px-6 py-12">
      <div className="mb-4 flex flex-row items-center gap-2 text-fd-muted-foreground">
        <Icon className="size-4" />
        <h2 className="text-sm font-medium">{heading}</h2>
      </div>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function Hero() {
  return (
    <div className="relative z-[2] flex flex-col border-x border-t bg-fd-card/80 px-6 pt-12 max-md:text-center md:px-12 md:pt-16 [.uwu_&]:hidden max-lg:overflow-hidden">
      <h1 className="mb-8 text-4xl font-medium md:hidden">Build Your Docs</h1>
      <h1 className="mb-8 max-w-[600px] text-4xl font-medium max-md:hidden">
        Build excellent documentation site with less effort
      </h1>
      <p className="mb-8 text-fd-muted-foreground md:max-w-[80%] md:text-xl">
        Fumadocs is a beautiful documentation framework for Developers, flexible
        and performant, with all features from Next.js.
      </p>
      <div className="inline-flex items-center gap-3 max-md:mx-auto">
        <Link
          href="/docs/ui"
          className={cn(
            buttonVariants({ size: 'lg', className: 'rounded-full' }),
          )}
        >
          Getting Started
        </Link>
        <a
          href="https://githubbox.com/fuma-nama/fumadocs-ui-template"
          className={cn(
            buttonVariants({
              size: 'lg',
              variant: 'outline',
              className: 'rounded-full bg-fd-background',
            }),
          )}
        >
          Open Demo
        </a>
      </div>
      <PreviewImages />
    </div>
  );
}

function Feedback() {
  return (
    <div className="relative flex flex-col items-center overflow-hidden border-x border-t px-6 py-8 md:py-16">
      <div
        className="absolute inset-x-0 bottom-0 z-[-1] h-24 opacity-30 duration-1000 animate-in fade-in"
        style={{
          maskImage: 'linear-gradient(to bottom,transparent,white)',
          backgroundImage:
            'linear-gradient(to right, #4ebfff, transparent, #e92a67)',
        }}
      />
      <p className="text-center font-medium text-fd-muted-foreground">
        Trusted by awesome teams and developers
      </p>

      <div className="mt-6 rounded-xl border bg-gradient-to-b from-secondary p-4 shadow-lg">
        <p className="text-sm font-medium">
          {`"A gorgeous documentation framework that composes beautifully into the
          App Router."`}
        </p>
        <div className="mt-4 flex flex-row items-center gap-2">
          <Image
            src="https://avatars.githubusercontent.com/u/35677084"
            alt="avatar"
            width="32"
            height="32"
            className="size-8 rounded-full"
          />
          <div>
            <a
              href="https://shew.dev"
              rel="noreferrer noopener"
              className="text-sm font-medium"
            >
              Anthony Shew
            </a>
            <p className="text-xs text-fd-muted-foreground">
              Turbo DX at Vercel
            </p>
          </div>
          <Link
            href="/showcase"
            className={cn(
              buttonVariants({ variant: 'outline', className: 'ml-auto' }),
            )}
          >
            Showcase
          </Link>
        </div>
      </div>
    </div>
  );
}

function Introduction(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 border-r md:grid-cols-2">
      <div className="flex flex-col gap-2 border-l border-t px-6 py-12 md:py-16">
        <div className={cn(badgeVariants())}>1</div>
        <h3 className="text-xl font-bold">Create it.</h3>
        <p className="mb-8 text-fd-muted-foreground">
          Initialize a new docs with a command.
        </p>
        <CreateAppAnimation />
      </div>
      <div className="flex flex-col gap-2 border-l border-t px-6 py-12 md:py-16">
        <div className={cn(badgeVariants())}>2</div>
        <h3 className="text-xl font-bold">Write.</h3>
        <p className="text-fd-muted-foreground">
          Write content, with automation tools & type-safe data validation.
        </p>
        <div className="relative flex flex-col">
          <CodeBlock
            lang="mdx"
            wrapper={{ className: 'absolute inset-x-2 top-0' }}
            code={`---
title: My Documentation
---

## Introduction

Hello World
`}
          />
          <Files className="z-[2] mt-48 shadow-xl">
            <Folder name="content" defaultOpen>
              <File name="index.mdx" />
              <File name="components.mdx" />
            </Folder>
          </Files>
        </div>
      </div>
      <div className="col-span-full flex flex-col items-center gap-2 border-l border-t px-6 py-12 text-center">
        <div className={cn(badgeVariants())}>3</div>
        <h3 className="text-2xl font-bold">Ship.</h3>
        <p className="text-fd-muted-foreground">
          Deploy your docs easily with Next.js compatible hosting platforms.
        </p>

        <div className="mt-4 flex flex-row flex-wrap items-center gap-8">
          <a href="https://vercel.com" rel="noreferrer noopener">
            <VercelLogo className="h-auto w-32" />
          </a>
          <a href="https://netlify.com" rel="noreferrer noopener">
            <NetlifyLogo className="h-auto w-32" />
          </a>
        </div>
      </div>
    </div>
  );
}

function Contributing() {
  return (
    <div className="flex flex-col items-center border-x border-t px-4 py-16 text-center">
      <Heart className="mb-4" />
      <h2 className="mb-4 text-xl font-semibold sm:text-2xl">
        Made Possible by You.
      </h2>
      <p className="mb-4 text-fd-muted-foreground">
        Fumadocs is 100% powered by passion and open source community.
      </p>
      <div className="mb-8 flex flex-row items-center gap-2">
        <Link
          href="/sponsors"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          Sponsors
        </Link>
        <a
          href="https://github.com/fuma-nama/fumadocs/graphs/contributors"
          rel="noreferrer noopener"
          className={cn(buttonVariants({ variant: 'ghost' }))}
        >
          Contributors
        </a>
      </div>
      <ContributorCounter repoOwner="fuma-nama" repoName="fumadocs" />
    </div>
  );
}

function Features() {
  return (
    <div className="grid grid-cols-1 border-r md:grid-cols-2">
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
              Fumadocs has native support for Content Collections and Fumadocs
              MDX, and compatible with your own CMS.
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
          <Image
            alt="Source"
            src={SourceImage}
            sizes="600px"
            className="-mt-16 w-[400px] min-w-[400px] invert dark:invert-0"
          />
          <div className="z-[2] mt-[-150px] w-[300px] overflow-hidden rounded-lg border border-fd-foreground/10 shadow-xl backdrop-blur-lg">
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
          className={cn(
            buttonVariants({ variant: 'outline', className: 'mt-4' }),
          )}
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
        <CodeBlock
          code="npx fumadocs add accordion"
          lang="bash"
          wrapper={{
            title: 'Terminal',
            allowCopy: false,
            className: 'backdrop-blur-sm',
          }}
        />
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
}): React.ReactElement {
  return (
    <div
      className={cn('border-l border-t px-6 py-12 md:py-16', className)}
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
