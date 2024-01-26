import { cva } from 'class-variance-authority';
import {
  AlertCircleIcon,
  BatteryChargingIcon,
  FileTextIcon,
  GithubIcon,
  KeyboardIcon,
  LayoutIcon,
  LibraryIcon,
  PaperclipIcon,
  PersonStandingIcon,
  RocketIcon,
  SearchIcon,
  StarsIcon,
  TimerIcon,
} from 'lucide-react';
import { File, Files } from 'fumadocs-ui/components/files';
import Link from 'next/link';
import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { CodeBlock } from '@/components/code-block';
import { CreateAppAnimation, Previews, Rain } from './page.client';
import {
  VercelLogo,
  NetlifyLogo,
  SourceSVG,
  NextSVG,
  ContentlayerIcon,
  OpenAPIIcon,
  EarthIcon,
} from './icons';

const badgeVariants = cva(
  'mb-2 inline-flex size-7 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground',
);

const code = `const frontmatterSchema = defaultValidators.frontmatter.extend({
  preview: z.string().optional()
})`;

export default function HomePage(): JSX.Element {
  return (
    <>
      <div
        className="absolute inset-x-0 top-[200px] h-[250px] max-md:hidden"
        style={{
          background:
            'repeating-linear-gradient(to right, hsl(var(--border)), transparent 1px, transparent 50px), repeating-linear-gradient(to bottom, hsl(var(--border)), transparent 1px, transparent 50px)',
        }}
      />
      <main className="container relative max-w-[1100px] px-2 py-4 sm:py-10">
        <div className="mx-auto mb-4 flex w-fit flex-row items-center gap-2 rounded-full border bg-muted p-2 text-sm">
          <AlertCircleIcon className="size-4" />
          We are renaming to Fumadocs
        </div>
        <div
          className="border-x border-t"
          style={{
            background:
              'repeating-linear-gradient(to bottom, transparent, hsl(var(--secondary)/.4) 500px, transparent 1000px)',
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
          </div>
          <div className="container border-b py-24">
            <h2 className="text-center text-2xl font-semibold sm:text-4xl">
              Start instantly.
              <br />
              Make it yours, Ship within seconds.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative flex flex-col border-b px-6 py-12 md:border-r md:py-16">
              <div className={cn(badgeVariants())}>1</div>
              <h3 className="text-xl font-bold">Create it.</h3>
              <p className="mb-8 text-muted-foreground">
                Initialize a new docs with a command.
              </p>
              <CreateAppAnimation />
            </div>
            <div className="relative flex flex-col border-b px-6 py-12 md:py-16">
              <div className={cn(badgeVariants())}>2</div>
              <h3 className="text-xl font-bold">Customise.</h3>
              <p className="text-muted-foreground">
                Modify the code, in a comfortable way with Typescript
                auto-complete.
              </p>
              <div className="relative flex flex-col">
                <CodeBlock
                  lang="ts"
                  wrapper={{ className: 'absolute inset-x-2 top-0' }}
                  code={code}
                />
                <Files className="z-[2] mt-20 shadow-xl">
                  <File title="content" defaultOpen>
                    <File title="index.mdx" />
                    <File title="hello.mdx" />
                    <File title="components.mdx" />
                  </File>
                </Files>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center border-b px-6 py-12 text-center">
            <div className={cn(badgeVariants())}>3</div>
            <h3 className="text-2xl font-bold">Ship.</h3>
            <p className="mb-2 text-muted-foreground">
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
                backgroundImage:
                  'repeating-linear-gradient(to right,hsl(var(--primary)/.1),hsl(var(--primary)/.1) 1px,transparent 1px,transparent 40px), repeating-linear-gradient(to bottom,hsl(var(--primary)/.1),hsl(var(--primary)/.1) 1px,transparent 1px,transparent 40px)',
              }}
            >
              <EarthIcon className="-my-8 mx-auto h-auto w-60" />
            </div>
          </div>
          <div className="container relative overflow-hidden border-b py-32">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">
              Loved by users.
              <br />
              Built for developers.
            </h2>
            <Rain
              width={1000}
              height={500}
              className="absolute inset-0 z-[-1] h-full w-full mix-blend-difference"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <div className="border-b px-6 py-16 md:border-r">
              <RocketIcon />
              <h2 className="mr-2 inline font-bold">Light and Fast.</h2>
              <span className="font-medium text-muted-foreground">
                Full powered documentation site with Next.js App Router.
              </span>
            </div>
            <div className="border-b px-6 py-16 lg:border-r">
              <TimerIcon />
              <h2 className="mr-2 inline font-bold">Optimized.</h2>
              <span className="font-medium text-muted-foreground">
                Less client components, less Javascript, optimized images.
              </span>
            </div>
            <div className="border-b px-6 py-16 md:border-r">
              <LayoutIcon />
              <h2 className="mr-2 inline font-bold">
                Accessibility & UX first.
              </h2>
              <span className="font-medium text-muted-foreground">
                Focus on user experience and accessibility, providing an
                excellent experience for your users.
              </span>
            </div>
            <div className="border-b px-6 py-16 lg:border-r">
              <SearchIcon />
              <h2 className="mr-2 inline font-bold">
                Powerful document search.
              </h2>
              <span className="font-medium text-muted-foreground">
                Built-in search implemented with Flexsearch, with high
                flexibility and performance.
              </span>
            </div>
            <div className="border-b px-6 py-16 md:border-r">
              <KeyboardIcon />
              <h2 className="mr-2 inline font-bold">Developer Experience.</h2>
              <span className="font-medium text-muted-foreground">
                Bundled with remark and rehype plugins that enhances the
                developer experience.
              </span>
            </div>
            <div className="border-b px-6 py-16">
              <PersonStandingIcon />
              <h2 className="mr-2 inline font-bold">Personalized.</h2>
              <span className="font-medium text-muted-foreground">
                Advanced options for customising your theme in a comfortable
                way.
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 divide-border md:grid-cols-2 md:divide-x">
            <div className="border-b px-6 py-16 md:py-20">
              <div className="mb-4 inline-flex items-center gap-2 font-medium text-muted-foreground">
                <PaperclipIcon className="size-5" />
                <p>Multiple Sources</p>
              </div>
              <h2 className="mb-1 text-xl font-semibold">
                Your source. Your choice.
              </h2>
              <p className="text-lg font-medium text-muted-foreground">
                Native support for different content sources including
                Contentlayer and the official next/mdx loader.
              </p>
              <SourceSVG className="mt-8 h-auto w-full" />
            </div>
            <div className="border-b px-6 py-16 md:py-20">
              <div className="mb-4 inline-flex items-center gap-2 font-medium text-muted-foreground">
                <SearchIcon className="size-5" />
                <p>Algolia Integration</p>
              </div>
              <h2 className="mb-1 text-xl font-semibold">
                Enhance your search experience.
              </h2>
              <p className="text-lg font-medium text-muted-foreground">
                Integrate with Algolia Search in your docs easily.
              </p>
              <Link
                href="/docs/headless/search/algolia"
                className={cn(
                  buttonVariants({ variant: 'outline', className: 'mt-4' }),
                )}
              >
                Learn More
              </Link>
              <Search />
            </div>
          </div>
          <div className="grid grid-cols-1 divide-border md:grid-cols-2 md:divide-x">
            <div className="relative overflow-hidden border-b px-6 py-16">
              <h2 className="text-2xl font-semibold">Heard of our users.</h2>
              <p className="text-lg font-medium text-muted-foreground">
                We are making it better.
              </p>
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
            </div>
            <div
              className="border-b px-6 py-16"
              style={{
                backgroundPositionX: '-2px',
                backgroundImage:
                  'repeating-linear-gradient(to bottom, hsl(var(--border)), hsl(var(--border)) 1px, transparent 2px, transparent 160px), repeating-linear-gradient(to right, hsl(var(--border)), hsl(var(--border)) 1px, transparent 2px, transparent 160px)',
              }}
            >
              <h2 className="text-2xl font-semibold">
                Flexibility that cover your needs.
              </h2>
              <p className="text-lg font-medium text-muted-foreground">
                Well documented, separated in packages.
              </p>

              <div className="mt-8 flex flex-col gap-4">
                <Link
                  href="/docs/ui"
                  className="rounded-xl bg-gradient-to-br from-primary p-px shadow-lg shadow-primary/20"
                >
                  <div className="rounded-[inherit] bg-background bg-gradient-to-t from-muted p-4 transition-colors hover:bg-muted">
                    <LayoutIcon />
                    <h3 className="font-semibold">Fumadocs UI</h3>
                    <p className="text-muted-foreground">
                      Full-powered framework with an excellent UI.
                    </p>
                  </div>
                </Link>
                <Link
                  href="/docs/headless"
                  className="rounded-xl bg-gradient-to-br from-secondary p-px shadow-lg"
                >
                  <div className="rounded-[inherit] bg-background p-4 transition-colors hover:bg-muted">
                    <LibraryIcon />
                    <h3 className="font-semibold">Core</h3>
                    <p className="text-muted-foreground">
                      Headless library with an useful set of utilities.
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 divide-border border-b md:grid-cols-2 md:divide-x lg:grid-cols-3">
            <div className="relative flex flex-col overflow-hidden px-8 py-14">
              <Rain
                width={500}
                height={1000}
                className="absolute inset-0 z-[-1] mix-blend-difference"
              />
              <h2 className="text-3xl font-bold">
                Create your first documentation.
              </h2>
              <ul className="my-8 flex flex-col gap-6">
                <li>
                  <span className="font-medium">
                    <BatteryChargingIcon className="inline" /> Battery
                    guaranteed.
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    Actively maintained, open for contributions.
                  </span>
                </li>
                <li>
                  <span className="font-medium">
                    <GithubIcon className="inline" /> Fully open-source.
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    Open source, available on Github.
                  </span>
                </li>
                <li>
                  <span className="font-medium">
                    <TimerIcon className="inline" /> Within seconds.
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    Initialize a new project instantly with CLI.
                  </span>
                </li>
              </ul>
              <div className="mt-auto flex flex-row gap-2 border-t pt-8">
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
            <Integration className="lg:col-span-2" />
          </div>
        </div>
      </main>
    </>
  );
}

const linkItemVariants = cva('transition-colors hover:bg-muted');

function Integration({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn(
        'relative grid grid-cols-1 border-l border-t *:border-b *:border-r *:p-6 lg:grid-cols-3',
        className,
      )}
      {...props}
    >
      <Link href="/docs/ui/openapi" className={cn(linkItemVariants())}>
        <OpenAPIIcon className="mb-2 size-12" />
        <p className="text-lg font-medium">OpenAPI</p>
        <p className="text-sm text-muted-foreground">
          Generate docs from your OpenAPI schema.
        </p>
      </Link>
      <Link href="/docs/mdx" className={cn(linkItemVariants())}>
        <NextSVG className="mb-2 size-12" />
        <p className="text-lg font-medium">Next.js</p>
        <p className="text-sm text-muted-foreground">
          Enjoy the full power of App Router.
        </p>
      </Link>
      <Link
        href="/docs/headless/contentlayer"
        className={cn(linkItemVariants())}
      >
        <ContentlayerIcon className="mb-2 size-12" />
        <p className="text-lg font-medium">Contentlayer</p>
        <p className="text-sm text-muted-foreground">
          Integrate with Contentlayer easily.
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
      <div className="col-span-full h-[200px] overflow-hidden bg-secondary">
        <div
          className="mx-auto h-[500px] w-[500px] rounded-full"
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
  'flex flex-row items-center gap-2 rounded-md p-2 text-sm text-popover-foreground hover:bg-accent',
);

function Search(): JSX.Element {
  const maskImage = 'linear-gradient(to bottom,white 30%,transparent)';
  return (
    <div
      className="mt-6 flex select-none flex-col rounded-md border bg-popover"
      style={{
        maskImage,
        WebkitMaskImage: maskImage,
      }}
    >
      <div className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm text-muted-foreground">
        <SearchIcon className="size-4" />
        Search...
      </div>
      <div className="border-t p-2">
        <div className={cn(searchItemVariants())}>
          <FileTextIcon className="size-4" />
          Getting Started
        </div>
        <div className={cn(searchItemVariants())}>
          <FileTextIcon className="size-4" />
          Components
        </div>
        <div className={cn(searchItemVariants())}>
          <FileTextIcon className="size-4" />
          MDX Content
        </div>
        <div className={cn(searchItemVariants())}>
          <FileTextIcon className="size-4" />
          User Guide
        </div>
      </div>
    </div>
  );
}

function Hero(): JSX.Element {
  return (
    <div className="container relative z-[2] flex flex-col items-center overflow-hidden border-b bg-background px-6 pt-20 text-center">
      <h1 className="mb-6 text-4xl font-semibold md:text-5xl">
        Build Your Docs.
      </h1>
      <p className="mb-6 h-fit p-2 text-muted-foreground md:max-w-[80%] md:text-xl">
        Fumadocs is the framework for building documentation with{' '}
        <b className="font-medium text-foreground">
          excellent UI and user experience
        </b>
        . Allow you to take advantage of Next.js App Router and React Server
        Component.
      </p>
      <div className="inline-flex items-center gap-3">
        <Link
          href="/docs"
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
              className: 'rounded-full bg-background',
            }),
          )}
        >
          Open Demo
        </a>
      </div>
      <div
        className="mb-[-150px] mt-16 size-[300px] rounded-full bg-background md:mb-[-250px] md:size-[500px]"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 80% 0%, transparent 40%, hsl(var(--primary)))',
          ].join(', '),
        }}
      />
      <div
        className="absolute inset-0 z-[-1] duration-1000 animate-in fade-in"
        style={{
          backgroundImage: [
            'radial-gradient(ellipse at bottom, transparent 60%, hsl(var(--primary) / 0.2))',
            'linear-gradient(to bottom, transparent 30%, hsl(var(--primary) / 0.3))',
            'linear-gradient(to bottom, hsl(var(--background)) 40%, transparent)',
            'repeating-linear-gradient(45deg, transparent,transparent 60px, hsl(var(--primary)) 61px, transparent 62px)',
          ].join(', '),
        }}
      />
    </div>
  );
}
