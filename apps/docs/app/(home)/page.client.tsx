'use client';

import {
  Fragment,
  type HTMLAttributes,
  type HTMLProps,
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { ArrowRight, TerminalIcon } from 'lucide-react';
import Link from 'next/link';
import scrollIntoView from 'scroll-into-view-if-needed';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import Image from 'next/image';
import MainImg from './main.png';
import OpenAPIImg from './openapi.png';
import NotebookImg from './notebook.png';
import { cva } from 'class-variance-authority';

export function CreateAppAnimation() {
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
      className="relative mt-4 w-full mx-auto max-w-[800px]"
      onMouseEnter={() => {
        if (tick >= timeEnd) {
          setTick(0);
        }
      }}
    >
      {tick > timeWindowOpen && (
        <LaunchAppWindow className="absolute bottom-5 right-4 z-10 animate-in fade-in slide-in-from-top-10" />
      )}
      <pre className="overflow-hidden rounded-xl border text-[13px] shadow-lg bg-fd-card">
        <div className="flex flex-row items-center gap-2 border-b px-4 py-2">
          <TerminalIcon className="size-4" />{' '}
          <span className="font-bold">Terminal</span>
          <div className="grow" />
          <div className="size-2 rounded-full bg-red-400" />
        </div>
        <div className="min-h-[200px]">
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
}) {
  const [active, setActive] = useState(0);
  const items = [
    'Full-text Search',
    'Design System & Tailwind CSS',
    'Generate from TypeScript & OpenAPI',
    'Interactive Examples',
    'Automation & Server',
  ];

  return (
    <div
      id="why-interactive"
      className="flex flex-col-reverse gap-3 md:flex-row md:min-h-[380px]"
    >
      <div className="flex flex-col">
        {items.map((item, i) => (
          <button
            key={item}
            ref={(element) => {
              if (!element || i !== active) return;

              scrollIntoView(element, {
                behavior: 'smooth',
                boundary: document.getElementById('why-interactive'),
              });
            }}
            type="button"
            className={cn(
              'transition-colors text-nowrap border border-transparent rounded-lg px-3 py-2.5 text-start text-sm text-fd-muted-foreground font-medium',
              i === active
                ? 'text-fd-primary bg-fd-primary/10 border-fd-primary/10'
                : 'hover:text-fd-accent-foreground/80',
            )}
            onClick={() => {
              setActive(i);
            }}
          >
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
        }`}
      </style>

      <div className="flex-1 p-4 border border-fd-primary/10 bg-fd-card/40 rounded-lg shadow-lg">
        {active === 0 ? (
          <WhyPanel>
            <h3>We made it simple.</h3>
            <p>
              Fumadocs offers native support for Orama and Algolia Search, it is
              as easy as plugging a route handler. You can also use your own
              search modal to allow full control over the search UI.
            </p>
            {props.codeblockSearchRouter}
          </WhyPanel>
        ) : null}

        {active === 1 ? (
          <WhyPanel>
            <h3>Tailwind CSS Plugin</h3>
            <p>
              Share the same design system cross the docs and your app with
              Tailwind CSS. Works great with <b>Shadcn UI</b>.
            </p>
            {props.codeblockTheme}
            <Link
              href="/docs/ui/theme"
              className={cn(buttonVariants(), 'not-prose')}
            >
              See Themes
            </Link>
          </WhyPanel>
        ) : null}

        {active === 2 ? (
          <WhyPanel>
            <h3>Never repeat yourself again.</h3>
            <p>
              Fumadocs has a smart Type Table component that renders the
              properties of interface/type automatically, from the source of
              truth, powered by the TypeScript Compiler API.
            </p>
            {props.typeTable}
            <p>
              We also have a built-in OpenAPI playground and docs generator.
            </p>

            <div className="mt-4 flex flex-row items-center gap-1.5 not-prose">
              <Link
                href="/docs/ui/components/auto-type-table"
                className={cn(buttonVariants())}
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
            <h3>Interactive docs with React.</h3>
            <p>
              Fumadocs offers many useful components, from File Tree, Tabs, to
              Zoomable Image.
            </p>
            {props.codeblockInteractive}
            <Link
              href="/docs/ui/components"
              className={cn(buttonVariants(), 'not-prose')}
            >
              View Components
            </Link>
          </WhyPanel>
        ) : null}
        {active === 4 ? (
          <WhyPanel>
            <h3>Connect your content and server.</h3>

            <p>
              React Server Component made it very easy to automate docs. Use
              server data, server components, and even client components in MDX
              documents.
            </p>

            {props.codeblockMdx}
          </WhyPanel>
        ) : null}
      </div>
    </div>
  );
}

function WhyPanel(props: HTMLProps<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'duration-700 animate-in fade-in text-sm prose',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

const previewButtonVariants = cva(
  'w-20 h-8 text-sm font-medium transition-colors rounded-full',
  {
    variants: {
      active: {
        true: 'text-fd-primary-foreground',
        false: 'text-fd-muted-foreground',
      },
    },
  },
);
export function PreviewImages() {
  const [active, setActive] = useState(0);
  const previews = [
    {
      image: MainImg,
      name: 'Docs',
    },
    {
      image: NotebookImg,
      name: 'Notebook',
    },
    {
      image: OpenAPIImg,
      name: 'OpenAPI',
    },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="absolute flex flex-row left-1/2 -translate-1/2 bottom-10 z-2 p-0.5 rounded-full bg-fd-card border shadow-xl">
        <div
          role="none"
          className="absolute bg-fd-primary rounded-full w-20 h-8 transition-transform z-[-1]"
          style={{
            transform: `translateX(calc(var(--spacing) * 20 * ${active}))`,
          }}
        />
        {previews.map((item, i) => (
          <button
            key={i}
            className={cn(previewButtonVariants({ active: active === i }))}
            onClick={() => setActive(i)}
          >
            {item.name}
          </button>
        ))}
      </div>
      {previews.map((item, i) => (
        <Image
          key={i}
          src={item.image}
          alt="preview"
          priority
          className={cn(
            'w-full select-none duration-1000 animate-in fade-in slide-in-from-bottom-12',
            active !== i && 'hidden',
          )}
        />
      ))}
    </div>
  );
}

const WritingTabs = [
  {
    name: 'Writer',
    value: 'writer',
  },
  {
    name: 'Developer',
    value: 'developer',
  },
  {
    name: 'Automation',
    value: 'automation',
  },
] as const;

export function Writing({
  tabs: tabContents,
}: {
  tabs: Record<(typeof WritingTabs)[number]['value'], ReactNode>;
}) {
  const [tab, setTab] =
    useState<(typeof WritingTabs)[number]['value']>('writer');

  return (
    <div className="my-20">
      <h2 className="text-4xl text-brand mb-8 font-tinos text-center">
        Anybody can write.
      </h2>
      <p className="text-center mb-8 mx-auto w-full max-w-[800px]">
        Native support for Markdown & MDX, offering intuitive, convenient and
        extensive syntax for non-dev writers, developers, and AI agents.
      </p>
      <div className="flex justify-center items-center gap-4 text-fd-muted-foreground mb-4">
        {WritingTabs.map((item) => (
          <Fragment key={item.value}>
            <ArrowRight className="size-4 first:hidden" />
            <button
              className={cn(
                'text-lg font-medium transition-colors',
                item.value === tab && 'text-brand',
              )}
              onClick={() => setTab(item.value)}
            >
              {item.name}
            </button>
          </Fragment>
        ))}
      </div>
      <div key={tab} className="animate-fd-fade-in">
        {tabContents[tab]}
      </div>
    </div>
  );
}
