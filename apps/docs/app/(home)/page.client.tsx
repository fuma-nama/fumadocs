'use client';

import {
  useEffect,
  useState,
  Fragment,
  type ReactElement,
  type HTMLAttributes,
  type ReactNode,
  type HTMLProps,
} from 'react';
import { TerminalIcon } from 'lucide-react';
import Link from 'next/link';
import scrollIntoView from 'scroll-into-view-if-needed';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';

export function CreateAppAnimation(): React.ReactElement {
  const installCmd = 'npm create fumadocs-app';
  const tickTime = 100;
  const timeCommandEnter = installCmd.length;
  const timeCommandRun = timeCommandEnter + 3;
  const timeCommandEnd = timeCommandRun + 3;
  const timeWindowOpen = timeCommandEnd + 1;
  const timeEnd = timeWindowOpen + 1;

  const [tick, setTick] = useState(timeEnd);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev >= timeEnd ? prev : prev + 1));
    }, tickTime);

    return () => {
      clearInterval(timer);
    };
  }, [timeEnd]);

  const lines: ReactElement[] = [];

  lines.push(
    <span key="command_type">
      {installCmd.substring(0, tick)}
      {tick < timeCommandEnter && (
        <div className="inline-block h-3 w-1 animate-pulse bg-white" />
      )}
    </span>,
  );

  if (tick >= timeCommandEnter) {
    lines.push(<span key="space"> </span>);
  }

  if (tick > timeCommandRun)
    lines.push(
      <Fragment key="command_response">
        <span className="font-bold">┌ Create Fumadocs App</span>
        <span>│</span>
        {tick > timeCommandRun + 1 && (
          <>
            <span className="font-bold">◇ Project name</span>
            <span>│ my-app</span>
          </>
        )}
        {tick > timeCommandRun + 2 && (
          <>
            <span>│</span>
            <span className="font-bold">◆ Choose a content source</span>
          </>
        )}
        {tick > timeCommandRun + 3 && (
          <>
            <span>│ ● Fumadocs MDX</span>
            <span>│ ○ Content Collections</span>
          </>
        )}
      </Fragment>,
    );

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (tick >= timeEnd) {
          setTick(0);
        }
      }}
    >
      {tick > timeWindowOpen && (
        <LaunchAppWindow className="absolute bottom-5 right-4 z-10 animate-in fade-in slide-in-from-top-10" />
      )}
      <pre className="overflow-hidden rounded-xl border text-xs">
        <div className="flex flex-row items-center gap-2 border-b px-4 py-2">
          <TerminalIcon className="size-4" />{' '}
          <span className="font-bold">Terminal</span>
          <div className="grow" />
          <div className="size-2 rounded-full bg-red-400" />
        </div>
        <div className="min-h-[200px] bg-gradient-to-b from-fd-secondary [mask-image:linear-gradient(to_bottom,white,transparent)]">
          <code className="grid p-4">{lines}</code>
        </div>
      </pre>
    </div>
  );
}

function LaunchAppWindow(
  props: HTMLAttributes<HTMLDivElement>,
): React.ReactElement {
  return (
    <div
      {...props}
      className={cn(
        'overflow-hidden rounded-md border bg-fd-background shadow-xl',
        props.className,
      )}
    >
      <div className="relative flex h-6 flex-row items-center border-b bg-fd-muted px-4 text-xs text-fd-muted-foreground">
        <p className="absolute inset-x-0 text-center">localhost:3000</p>
      </div>
      <div className="p-4 text-sm">New App launched!</div>
    </div>
  );
}

export function WhyInteractive(props: {
  codeblockTheme: ReactNode;
  codeblockSearchRouter: ReactNode;
  codeblockInteractive: ReactNode;
  typeTable: ReactNode;
  codeblockMdx: ReactNode;
}): ReactNode {
  const [autoActive, setAutoActive] = useState(true);
  const [active, setActive] = useState(0);
  const duration = 1000 * 8;
  const items = [
    'Full-text Search',
    'Design System & Tailwind CSS',
    'Generate from TypeScript & OpenAPI',
    'Interactive Examples',
    'Automation & Server',
    'Flexible',
  ];

  useEffect(() => {
    if (!autoActive) return;
    const timer = setTimeout(() => {
      setActive((prev) => (prev + 1) % items.length);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [active, autoActive, duration, items.length]);

  if (typeof window !== 'undefined') {
    const element = document.getElementById(
      `why-interactive-${active.toString()}`,
    );

    if (element) {
      scrollIntoView(element, {
        behavior: 'smooth',
        boundary: document.getElementById('why-interactive'),
      });
    }
  }

  return (
    <div
      id="why-interactive"
      className="-mx-6 mt-8 flex flex-col gap-4 rounded-lg border border-foreground/10 bg-fd-muted/50 p-4 shadow-lg lg:flex-row lg:gap-6 lg:p-6"
    >
      <div className="-mt-1.5 flex flex-row overflow-x-auto max-lg:-mx-4 max-lg:items-center max-lg:px-2 lg:-ml-4 lg:flex-col">
        {items.map((item, i) => (
          <button
            key={item}
            id={`why-interactive-${i.toString()}`}
            type="button"
            className={cn(
              'inline-flex flex-col-reverse text-nowrap rounded-lg py-1.5 text-left text-sm font-medium text-muted-foreground transition-colors max-lg:px-2 lg:flex-row',
              i === active
                ? 'text-primary max-lg:bg-primary/10'
                : 'hover:text-accent-foreground/80',
              i === active && autoActive ? '' : 'max-lg:pb-2.5 lg:pl-3',
            )}
            onClick={() => {
              if (active === i) setAutoActive((prev) => !prev);
              else setActive(i);
            }}
          >
            {i === active && autoActive ? (
              <div
                className="animate-[why-interactive-x] rounded-lg bg-primary max-lg:h-1 lg:mr-2 lg:w-1 lg:animate-[why-interactive-y]"
                style={{
                  animationDuration: `${duration.toString()}ms`,
                  animationFillMode: 'forwards',
                }}
              />
            ) : null}
            {item}
          </button>
        ))}
      </div>
      <style>
        {`
        @keyframes why-interactive-x {
          from {
            width: 0px;
          }
          
          to {
            width: 100%;
          }
        }
        
        @keyframes why-interactive-y {
          from {
            height: 0px;
          }
          
          to {
            height: 100%;
          }
        }`}
      </style>

      <div className="flex-1">
        {active === 0 ? (
          <WhyPanel>
            <h3 className="mb-2 text-lg font-semibold">
              Implementing search is difficult, we made it simple.
            </h3>
            <p>
              Fumadocs offers native support for <b>Orama</b> and{' '}
              <b>Algolia Search</b>, it is as easy as plugging a route handler.
            </p>
            {props.codeblockSearchRouter}
            <p className="mb-4 text-muted-foreground">
              In addition, you can plug your own search modal to allow full
              control over the search UI.
            </p>
            <div className="flex flex-row items-center gap-1.5">
              <Link
                href="/docs/headless/search"
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                Check the docs
              </Link>
              <Link
                href="/docs/ui/search"
                className={cn(buttonVariants({ variant: 'ghost' }))}
              >
                Customise UI?
              </Link>
            </div>
          </WhyPanel>
        ) : null}

        {active === 1 ? (
          <WhyPanel>
            <h3 className="mb-2 text-lg font-semibold">Tailwind CSS Plugin</h3>
            <p>
              Share the same design system cross the docs and your app with
              Tailwind CSS. Works great with <b>Shadcn UI</b>.
            </p>
            {props.codeblockTheme}
            <Link
              href="/docs/ui/theme"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              See Themes
            </Link>
          </WhyPanel>
        ) : null}

        {active === 2 ? (
          <WhyPanel>
            <h3 className="mb-2 text-lg font-semibold">
              From the source of truth, never repeat yourself again.
            </h3>
            <p>
              Fumadocs has a smart Type Table component that renders the
              properties of interface/type automatically, powered by the
              TypeScript Compiler API.
            </p>
            {props.typeTable}
            <p>
              We also have a built-in OpenAPI playground and docs generator.
            </p>

            <div className="mt-4 flex flex-row items-center gap-1.5">
              <Link
                href="/docs/ui/components/auto-type-table"
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                Type Table
              </Link>
              <Link
                href="/docs/ui/openapi"
                className={cn(buttonVariants({ variant: 'ghost' }))}
              >
                OpenAPI Integration
              </Link>
            </div>
          </WhyPanel>
        ) : null}
        {active === 3 ? (
          <WhyPanel>
            <h3 className="mb-2 text-lg font-semibold">
              Interactive docs with React.
            </h3>
            <p>
              Fumadocs offers many useful components, from File Tree, Tabs, to
              Zoomable Image.
            </p>
            {props.codeblockInteractive}
            <Link
              href="/docs/ui/components"
              className={cn(buttonVariants({ variant: 'outline' }))}
            >
              View Components
            </Link>
          </WhyPanel>
        ) : null}
        {active === 4 ? (
          <WhyPanel>
            <h3 className="mb-2 text-lg font-semibold">
              Connect your content and server.
            </h3>

            <p>
              React Server Component made it very easy to automate docs. Use
              server data, server components, and even client components in MDX
              documents.
            </p>

            {props.codeblockMdx}
          </WhyPanel>
        ) : null}
        {active === 5 ? (
          <WhyPanel>
            <h3 className="mb-2 text-lg font-semibold">
              Your own content source, search solution, everything.
            </h3>
            <p>
              Fumadocs is designed to be flexible, working with any content
              sources, offering powerful utilities.
              <br />
              <br />
              With our remark plugins, you can parse documents into search
              indexes, and integrate with different search solutions seamlessly.
            </p>

            <Link
              href="/docs/headless/mdx/structure"
              className={cn(
                buttonVariants({ className: 'mt-4', variant: 'outline' }),
              )}
            >
              See MDX Plugins
            </Link>
          </WhyPanel>
        ) : null}
      </div>
    </div>
  );
}

function WhyPanel(props: HTMLProps<HTMLDivElement>): ReactNode {
  return (
    <div
      {...props}
      className={cn(
        'duration-700 animate-in fade-in slide-in-from-bottom-8',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
