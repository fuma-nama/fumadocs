import { cva } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import {
  BatteryChargingIcon,
  CpuIcon,
  FileEditIcon,
  FileTextIcon,
  KeyboardIcon,
  LayoutIcon,
  LibraryIcon,
  MessageCircleIcon,
  PaperclipIcon,
  PersonStandingIcon,
  RocketIcon,
  SearchIcon,
  StarsIcon,
  TimerIcon,
} from 'lucide-react';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import Image from 'next/image';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { CodeBlock } from '@/components/code-block';
import { UwuHero } from '@/app/(home)/uwu';
import SourceImage from '@/public/source.png';
import ContributorCounter from '@/components/contributor-count';
import { CreateAppAnimation, Previews } from './page.client';
import {
  VercelLogo,
  NetlifyLogo,
  NextSVG,
  OpenAPIIcon,
  EarthIcon,
} from './icons';

const badgeVariants = cva(
  'mb-2 inline-flex size-7 items-center justify-center rounded-full bg-fd-primary font-medium text-fd-primary-foreground',
);

const code = `const frontmatterSchema = defaultValidators.frontmatter.extend({
  preview: z.string().optional()
})`;

export default function Page(): React.ReactElement {
  return (
    <>
      <div
        className="absolute inset-x-0 top-[200px] h-[250px] max-md:hidden"
        style={{
          background:
            'repeating-linear-gradient(to right, hsl(var(--primary)/.1),hsl(var(--primary)/.1) 1px,transparent 1px,transparent 50px), repeating-linear-gradient(to bottom, hsl(var(--primary)/.1),hsl(var(--primary)/.1) 1px,transparent 1px,transparent 50px)',
        }}
      />
      <main className="container relative max-w-[1100px] px-2 py-4 lg:py-16">
        <div
          style={{
            background:
              'repeating-linear-gradient(to bottom, transparent, hsl(var(--secondary)/.2) 500px, transparent 1000px)',
          }}
        >
          <div className="relative">
            <StarsIcon
              className="absolute -left-2 -top-2 z-10 size-4 xl:scale-[200%]"
              stroke="none"
              fill="currentColor"
            />
            <StarsIcon
              className="absolute -bottom-2 -right-2 z-10 size-4 xl:scale-[200%]"
              stroke="none"
              fill="currentColor"
            />
            <Hero />
            <UwuHero />
          </div>
          <div className="container border-x border-t py-24">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">
              Start instantly.
              <br />
              Make it yours, Ship within seconds.
            </h2>
          </div>
          <Introduction />
          <Why />
          <div
            className="container relative overflow-hidden border-x border-t py-16 sm:py-24"
            style={{
              backgroundImage:
                'radial-gradient(circle at bottom center, hsl(var(--secondary)), hsl(var(--background)))',
            }}
          >
            <h2 className="bg-gradient-to-b from-fd-primary to-fd-foreground/40 bg-clip-text text-center text-2xl font-semibold text-transparent sm:text-3xl">
              Loved by users.
              <br />
              Built for developers.
            </h2>

            <div
              className="mx-auto mb-[-160px] mt-8 flex h-[240px] flex-row overflow-hidden rounded-xl border bg-fd-card/50 backdrop-blur-lg md:w-[70%]"
              style={{
                maskImage: 'linear-gradient(to bottom, white, transparent)',
              }}
            >
              <div className="flex w-1/4 flex-col gap-4 border-r bg-fd-card p-4">
                <div className="h-4 w-full rounded-full bg-fd-muted-foreground/20" />
                <div className="h-4 w-1/2 rounded-full bg-fd-muted-foreground/20" />
                <div className="h-4 w-1/2 rounded-full bg-fd-muted-foreground/20" />
              </div>
              <div className="flex flex-1 flex-col gap-4 px-4 py-8">
                <div className="mb-3 h-6 w-1/4 rounded-full bg-fd-muted-foreground/20" />
                <div className="h-4 w-1/3 rounded-full bg-fd-muted-foreground/20" />
                <div className="h-4 w-full rounded-full bg-fd-muted-foreground/20" />
                <div className="h-4 w-1/2 rounded-full bg-fd-muted-foreground/20" />
              </div>
              <div className="w-1/4 pt-8 max-lg:hidden">
                <div className="h-4 w-1/2 rounded-full bg-fd-muted-foreground/20" />
              </div>
            </div>
          </div>
          <Features />
          <Highlights />
          <Contributing />
          <End />
        </div>
      </main>
    </>
  );
}

function WhyCard(props: HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      className="rounded-xl border border-foreground/10 bg-fd-card/20 p-4 text-foreground/50 shadow-xl backdrop-blur-xl transition-colors hover:text-foreground"
      style={{
        transform: 'translate3d(12px,-24px,0)',
      }}
      {...props}
    >
      {props.children}
    </div>
  );
}

function Why(): React.ReactElement {
  return (
    <div
      className="container relative overflow-hidden border-x border-t p-8"
      style={{
        perspective: '900px',
      }}
    >
      {new Array(10).fill(0).map((_, i) => (
        <div
          // eslint-disable-next-line react/no-array-index-key -- static
          key={i}
          className="absolute -left-10 top-0 z-[-1] h-[1000px] max-h-[100vw] origin-top-right rotate-45 bg-gradient-to-b from-primary blur-xl"
          style={{
            width: Math.random() * 32,
            animation: `lightray ${((i + 2) * 2).toString()}s linear infinite`,
          }}
        />
      ))}
      <style>
        {`@keyframes lightray {
        from {
        transform: rotate(40deg);
        opacity: 100%;
        }
        to {
        transform: rotate(-90deg);
        opacity: 0%;
        }
        }`}
      </style>
      <h2 className="bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-2xl font-semibold text-transparent">
        It can be Simple
        <br />
        Without crazy Abstraction
      </h2>
      <p className="mt-4 text-foreground/50">
        Fumadocs offers a complete toolchain to maintain your docs.
      </p>
      <Accordions
        type="single"
        className="mt-8 max-w-[400px] border-foreground/10 bg-card/50 backdrop-blur-lg"
      >
        <Accordion className="text-sm" title="Design System & Tailwind CSS">
          <p>
            Using our Tailwind CSS plugin, you can share the same design system
            cross the docs and your app.
          </p>
          <Link
            href="/docs/ui/theme"
            className={cn(
              buttonVariants({ className: 'mt-4', variant: 'outline' }),
            )}
          >
            See Themes
          </Link>
        </Accordion>
        <Accordion className="text-sm" title="Full-text Search">
          <p>
            Implementing search is difficult. Fumadocs offers native support for
            Flexsearch and Algolia Search, it is as simple as plugging a route
            handler.
          </p>
          <Link
            href="/docs/headless/search"
            className={cn(
              buttonVariants({ className: 'mt-4', variant: 'outline' }),
            )}
          >
            See Search
          </Link>
        </Accordion>
        <Accordion className="text-sm" title="Other Search Solutions">
          <p>
            Fumadocs offers utilities to parse document into search indexes. You
            can integrate with different search solutions seamlessly.
          </p>
          <p className="mt-4 text-muted-foreground">
            In addition, you can plug your own search modal to allow full
            control over the search UI.
          </p>
          <Link
            href="/docs/headless/mdx/structure"
            className={cn(
              buttonVariants({ className: 'mt-4', variant: 'outline' }),
            )}
          >
            See Plugin
          </Link>
        </Accordion>
        <Accordion className="text-sm" title="Generate docs from TypeScript">
          <p>
            Fumadocs has a smart Type Table component that renders the
            properties of interface/type automatically, powered by the
            TypeScript Compiler API.
          </p>
          <Link
            href="/docs/ui/typescript"
            className={cn(
              buttonVariants({ className: 'mt-4', variant: 'outline' }),
            )}
          >
            TypeScript Integration
          </Link>
        </Accordion>
        <Accordion className="text-sm" title="Generate docs from OpenAPI">
          <p>
            Fumadocs offers built-in OpenAPI playground and docs generator. You
            can also try{' '}
            <a
              href="https://docs.scalar.com/swagger-editor"
              rel="noreferrer noopener"
            >
              Scalar
            </a>
            , a beautiful alternative to Fumadocs OpenAPI.
          </p>
          <Link
            href="/docs/ui/openapi"
            className={cn(
              buttonVariants({ className: 'mt-4', variant: 'outline' }),
            )}
          >
            OpenAPI Integration
          </Link>
        </Accordion>
        <Accordion className="text-sm" title="Interactive Examples">
          <p>
            Fumadocs offers different useful components, like Files and Zoomable
            Image.
          </p>

          <p className="mt-4">
            With the magic of React Server Component and App Router, you can
            have server component inside MDX documents, and import client
            components from MDX files.
          </p>
        </Accordion>
      </Accordions>
      <div
        className="absolute bottom-8 right-12 z-[-1] grid origin-center grid-cols-2 gap-4 rounded-lg border border-foreground/20 lg:max-w-[50%]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--foreground)/.1) 1px, transparent 1px), linear-gradient(to right, hsl(var(--foreground)/.1) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          transform: 'rotate3d(1,0,0,40deg)',
        }}
      >
        <WhyCard>
          <h3 className="text-lg">Full-text Search</h3>
        </WhyCard>
        <WhyCard>
          <h3 className="text-lg">Docs Automation</h3>
        </WhyCard>
        <WhyCard>
          <h3 className="text-lg">Interactive Examples</h3>
        </WhyCard>
        <WhyCard>
          <h3 className="text-lg">Custom Content Source</h3>
        </WhyCard>
      </div>
    </div>
  );
}

function End(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 border-b border-r md:grid-cols-2 lg:grid-cols-3">
      <div className="relative flex flex-col gap-8 overflow-hidden border-l border-t px-8 py-14">
        <h2 className="text-3xl font-semibold md:text-4xl">Build Your Docs.</h2>
        <ul className="mt-8 flex flex-col gap-6">
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
              'radial-gradient(circle at 0% 100%, transparent 60%, hsl(var(--primary)))',
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

function Hero(): React.ReactElement {
  return (
    <div className="container relative z-[2] flex flex-col items-center overflow-hidden border-x border-t bg-fd-background px-6 pt-12 text-center md:pt-20 [.uwu_&]:hidden">
      <h1 className="mb-6 text-4xl font-semibold md:text-5xl">
        Build Your Docs.
      </h1>
      <p className="mb-6 h-fit p-2 text-fd-muted-foreground md:max-w-[80%] md:text-xl">
        Fumadocs is the documentation framework with{' '}
        <b className="font-medium text-fd-foreground">
          excellent UI and user experience
        </b>
        , powered by Next.js App Router. Designed to be flexible and fast.
      </p>
      <div className="inline-flex items-center gap-3">
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
      <svg
        viewBox="0 0 500 500"
        className="mb-[-150px] mt-16 size-[300px] duration-1000 animate-in slide-in-from-bottom-[500px] dark:invert md:mb-[-250px] md:size-[500px]"
      >
        <defs>
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.6"
              numOctaves="1"
              seed="15"
              result="turbulence"
            />
            <feComposite in="SourceGraphic" in2="turbulence" operator="in" />
            <feComposite in2="SourceGraphic" operator="lighter" />
          </filter>
          <radialGradient
            id="Gradient1"
            cx="50%"
            cy="50%"
            r="80%"
            fx="10%"
            fy="10%"
          >
            <stop stopColor="white" offset="35%" />
            <stop stopColor="black" offset="100%" />
          </radialGradient>
        </defs>
        <circle
          cx="250"
          cy="250"
          r="250"
          fill="url(#Gradient1)"
          filter="url(#noiseFilter)"
        />
      </svg>
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse at top, transparent 60%, hsl(var(--primary) / 0.2))',
            'linear-gradient(to bottom, transparent 30%, hsl(var(--primary) / 0.2))',
            'linear-gradient(to bottom, hsl(var(--background)) 40%, transparent)',
            'repeating-linear-gradient(45deg, transparent,transparent 60px, hsl(var(--primary)) 61px, transparent 62px)',
          ].join(', '),
        }}
      />
    </div>
  );
}

function Introduction(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 border-r md:grid-cols-2">
      <div className="flex flex-col border-l border-t px-6 py-12 md:py-16">
        <div className={cn(badgeVariants())}>1</div>
        <h3 className="text-xl font-bold">Create it.</h3>
        <p className="mb-8 text-fd-muted-foreground">
          Initialize a new docs with a command.
        </p>
        <CreateAppAnimation />
      </div>
      <div className="flex flex-col border-l border-t px-6 py-12 md:py-16">
        <div className={cn(badgeVariants())}>2</div>
        <h3 className="text-xl font-bold">Customise.</h3>
        <p className="text-fd-muted-foreground">
          Modify the code, in a comfortable way with Typescript auto-complete.
        </p>
        <div className="relative flex flex-col">
          <CodeBlock
            lang="ts"
            wrapper={{ className: 'absolute inset-x-2 top-0' }}
            code={code}
          />
          <Files className="z-[2] mt-20 shadow-xl">
            <Folder name="content" defaultOpen>
              <File name="index.mdx" />
              <File name="hello.mdx" />
              <File name="components.mdx" />
            </Folder>
          </Files>
        </div>
      </div>
      <div className="col-span-full flex flex-col items-center border-l border-t px-6 py-12 text-center">
        <div className={cn(badgeVariants())}>3</div>
        <h3 className="text-2xl font-bold">Ship.</h3>
        <p className="mb-2 text-fd-muted-foreground">
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

        <div
          className="mt-8 w-full"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(to right,hsl(var(--primary)/.1),hsl(var(--primary)/.1) 1px,transparent 1px,transparent 40px)',
              'repeating-linear-gradient(to bottom,hsl(var(--primary)/.1),hsl(var(--primary)/.1) 1px,transparent 1px,transparent 40px)',
            ].join(','),
          }}
        >
          <EarthIcon className="-my-8 mx-auto h-auto w-60" />
        </div>
      </div>
    </div>
  );
}

function Contributing(): React.ReactElement {
  return (
    <div className="flex flex-col items-center border-x border-t px-4 py-16 text-center">
      <h2 className="mb-4 text-xl font-semibold sm:text-2xl">
        Made Possible by You.
      </h2>
      <p className="mb-8 text-fd-muted-foreground">
        Fumadocs is 100% powered by passion and open source community.
      </p>
      <ContributorCounter repoOwner="fuma-nama" repoName="fumadocs" />
    </div>
  );
}

function Features(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 border-r md:grid-cols-2">
      <Feature
        icon={PaperclipIcon}
        subheading="Source Agnostic"
        heading="Your source. Your choice"
        description={
          <>
            <span className="font-medium text-foreground">
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
            'radial-gradient(circle at 60% 50%,hsl(var(--secondary)),hsl(var(--background)) 80%)',
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
        description="Integrate with Algolia Search in your docs easily."
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
        icon={MessageCircleIcon}
        subheading="Feedback"
        heading="Loved by developers"
        description="Fumadocs is trusted by many awesome developers, and we are making it better."
      >
        <Link
          href="/showcase"
          className={cn(
            buttonVariants({ variant: 'outline', className: 'mt-4' }),
          )}
        >
          Showcase
        </Link>

        <div className="mt-8">
          <Previews />
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
              Headless library with an useful set of utilities.
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
