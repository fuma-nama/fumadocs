import type { CSSProperties, ReactNode } from 'react';
import { FileIcon, RotateCcw, Search, SidebarIcon, Text } from 'lucide-react';
import { Banner } from 'fumadocs-ui/components/banner';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { DocsDescription, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import pkg from 'fumadocs-ui/package.json';
import { cn } from '@/lib/cn';
import { copy } from '../../content';
import { DITHER_MASKS } from '../../lib/dither';
import { Figure, FigureHeader } from '../../ui/figure';
import { Window } from '../../ui/window';
import { deliveries, type Entry, type Plan, plans } from './data';
import { Editor } from './editor';
import { Stage } from './stage';

/** the classes your copy of the component adds: `DocsTitle`'s, or `Banner`'s over the page */
interface PreviewProps {
  title?: string;
  banner?: string;
}

/** each plan's page before and after its edit */
const previews: Record<Plan['id'], { before: PreviewProps; after: PreviewProps }> = {
  customize: { before: {}, after: { title: 'text-[2.5em]' } },
  add: { before: { banner: '' }, after: { banner: 'bg-fd-primary text-fd-primary-foreground' } },
};

/** a part of the machine: in its block, against the tree's column from 1280px */
function machine(className: string) {
  return cn('absolute xl:col-start-2 xl:row-start-1 xl:row-end-2', className);
}

const chip =
  'inline-flex h-7 items-center justify-center border border-lp-line-strong bg-lp-paper px-2.5 text-xs font-medium transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-lp-ink aria-pressed:bg-lp-yellow aria-pressed:text-lp-on-yellow';

// classes of `layouts/docs/slots/sidebar.tsx`
const item =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0';

/** a frame round the part your edit changed: the scene shows it a moment as the change dithers in,
 * reduced motion and no script keep it */
const mark =
  'pointer-events-none absolute border-2 opacity-0 motion-reduce:opacity-100 noscript:opacity-100';

/**
 * The template's first page in the docs layout, `content/docs/index.mdx` as it is: the real title,
 * description, cards and banner, in chrome that mirrors `fumadocs-ui/layouts/docs` with its links as
 * plain text. Your edit applies as the class it produces, `cn` merges it the same way.
 */
function Preview({ title, banner }: PreviewProps) {
  return (
    <div className="@container isolate flex h-full flex-col bg-fd-background text-xs/normal text-fd-foreground">
      {banner !== undefined && (
        // not sticky: the page doesn't scroll inside the preview
        <Banner changeLayout={false} className={cn('relative z-0', banner)}>
          Hello World
          {banner && <span aria-hidden data-mark className={cn(mark, 'inset-1 border-current')} />}
        </Banner>
      )}
      {/* classes of `layouts/docs/slots/header.tsx` */}
      <div className="flex h-12 items-center border-b ps-4 pe-2.5 md:hidden">
        <p className="flex-1 font-semibold">My App</p>
        <span className="p-2 text-fd-muted-foreground [&_svg]:size-4">
          <Search />
        </span>
        <span className="p-2 text-fd-muted-foreground [&_svg]:size-4">
          <SidebarIcon />
        </span>
      </div>
      <div className="flex flex-1">
        <div className="hidden w-3/8 shrink-0 flex-col gap-2 border-e bg-fd-card p-2 md:flex @xl:w-45 @3xl:w-47.5">
          <p className="px-2 pt-1 font-medium">My App</p>
          <p className="flex items-center gap-2 rounded-lg border bg-fd-secondary/50 p-1.5 text-fd-muted-foreground [&_svg]:size-3.5">
            <Search />
            Search
          </p>
          <div className="flex flex-col">
            <span className={cn(item, 'bg-fd-primary/10 text-fd-primary')}>Hello World</span>
            <span className={item}>Components</span>
          </div>
        </div>
        <article className="flex min-w-0 flex-1 flex-col px-4 py-6 md:px-5 md:pt-8 md:@xl:px-8">
          {/* a heading inside the figure's own */}
          <DocsTitle aria-level={3} className={cn('relative w-fit', title)}>
            Hello World
            {title && (
              <span
                aria-hidden
                data-mark
                className={cn(mark, '-inset-x-2 inset-y-0.5 border-lp-orange')}
              />
            )}
          </DocsTitle>
          <DocsDescription className="mb-4 text-sm">Your first document</DocsDescription>
          <p className="text-fd-muted-foreground">
            Welcome to the docs! You can start writing documents in{' '}
            <code className="rounded-md border bg-fd-muted p-0.5 text-[0.85em]">/content/docs</code>
            .
          </p>
          <p role="heading" aria-level={4} className="mt-6 mb-3 text-sm font-semibold">
            What is Next?
          </p>
          <Cards>
            <Card title="Learn more about Next.js" />
            <Card title="Learn more about Fumadocs" />
          </Cards>
        </article>
        <div className="hidden w-42.5 shrink-0 flex-col gap-3 pt-8 pe-4 md:@3xl:flex">
          <p className="inline-flex items-center gap-1.5 text-fd-muted-foreground [&_svg]:size-3.5">
            <Text />
            On this page
          </p>
          <p className="border-s ps-3 text-fd-primary">What is Next?</p>
        </div>
      </div>
    </div>
  );
}

/** your project's rows as the real `Files` component, each carrying its path for the scene */
function rows(entries: Entry[]): ReactNode[] {
  const out: ReactNode[] = [];
  for (const entry of entries) {
    const data = { 'data-path': entry.path, 'data-added': entry.added || undefined };
    if (entry.children) {
      out.push(
        <Folder key={entry.path} name={entry.name} defaultOpen={entry.open} {...data}>
          {rows(entry.children)}
        </Folder>,
      );
    } else {
      out.push(<File key={entry.path} name={entry.name} className="py-0.5 md:text-xs" {...data} />);
    }
  }
  return out;
}

/** the bubble's tail in hundredths of an em of its line: it drops from the foot's corner, along the
 * bubble's edge, onto the answer's first letter, its root `root` wide */
const TAIL = { root: 80, drop: 55 };

function em(hundredths: number) {
  return `${hundredths / 100}em`;
}

/**
 * The lead asked as a question, set as speech: half the title's size (16px at least) in the titles'
 * medium, paper on the page's ink, a bubble and its tail filled as one shape over the dithered shadow
 * of the desk's hub plate.
 */
function Asked({ children }: { children: string }) {
  const foot = `calc(100% - ${em(TAIL.drop)})`;
  return (
    <span
      className="relative isolate block w-fit font-pixel text-mark leading-none font-normal tracking-normal"
      style={{ marginBottom: em(TAIL.drop + 50) }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 translate-x-0.75 translate-y-1 bg-lp-ink-2"
        style={{
          bottom: `-${em(TAIL.drop)}`,
          clipPath: `polygon(0 0, 100% 0, 100% ${foot}, ${em(TAIL.root)} ${foot}, 0 100%)`,
          maskImage: DITHER_MASKS[6],
          maskSize: '4px 4px',
        }}
      />
      <span className="relative block bg-lp-ink px-[0.75em] py-[0.55em] whitespace-nowrap text-lp-paper [text-box:trim-both_cap_alphabetic]">
        {children}
      </span>
      {/* a pixel into the bubble, so the two fills meet without a seam */}
      <svg
        aria-hidden
        viewBox={`0 0 ${TAIL.root} ${TAIL.drop}`}
        preserveAspectRatio="none"
        className="absolute top-full left-0 -mt-px overflow-visible fill-lp-ink"
        style={{ width: em(TAIL.root), height: em(TAIL.drop) }}
      >
        <path d={`M0 0V${TAIL.drop}L${TAIL.root} 0Z`} />
      </svg>
    </span>
  );
}

/**
 * The split-flap file count on the hopper, above your project's window: at its end on a phone,
 * centred from 768px, toward the riser from 1280px
 */
function Counter({ count }: { count: number }) {
  const flaps: ReactNode[] = [];
  const digits = String(count);
  for (let i = 0; i < digits.length; i++) {
    flaps.push(
      <span
        key={i}
        data-flap
        className="relative grid h-6 w-3.75 place-items-center overflow-hidden bg-lp-ink font-pixel text-base leading-none text-lp-sun after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-lp-paper md:h-7 md:w-4.5 md:text-xl dark:bg-lp-paper-2"
      >
        {digits[i]}
      </span>,
    );
  }
  return (
    <p
      data-counter
      className="absolute right-4 bottom-full z-6 mb-2.5 flex items-center gap-1.5 border border-lp-line-strong bg-lp-paper px-3 py-1 md:right-auto md:left-1/2 md:-translate-x-1/2 md:gap-2 xl:left-5 xl:translate-x-0"
    >
      <span className="flex gap-px">{flaps}</span>
      {/* the plural keeps its width while the count is 1 */}
      <span className="grid font-pixel text-xs text-lp-ink-2 *:col-start-1 *:row-start-1">
        <span aria-hidden className="invisible">
          files
        </span>
        <span data-noun>{count === 1 ? 'file' : 'files'}</span>
      </span>
    </p>
  );
}

export function Cli() {
  const cells: ReactNode[] = [];
  const editors: ReactNode[] = [];
  const cards: ReactNode[] = [];
  const chips: ReactNode[] = [];
  const commands: ReactNode[] = [];
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    for (const delivery of deliveries(plan)) {
      // each file moved by the engine while it's carried, without a repaint; a later file always
      // stands nearer the viewer, so the order they come in stacks them
      cards.push(
        <div
          key={`${plan.id}:${delivery.path}`}
          data-inlet={delivery.inlet}
          data-scene={i}
          data-reveals={delivery.reveals.join(' ')}
          inert={i > 0}
          className="invisible absolute top-0 left-0 flex h-6 origin-top-left items-center gap-1.5 border border-lp-line-strong bg-lp-paper px-2 font-mono text-xs whitespace-nowrap"
        >
          <FileIcon className="size-3.5 text-lp-ink-2" />
          {delivery.name}
        </div>,
      );
    }
    cells.push(
      <div
        key={plan.id}
        data-tree-cell
        data-scene={i}
        data-done={plan.done}
        data-fetch={plan.fetch}
        data-component={plan.component}
        inert={i > 0}
        className="relative col-start-1 row-start-2 mt-4 inert:invisible md:col-start-2 md:mt-6 xl:row-start-1 xl:mt-(--cli-top)"
      >
        <Counter count={plan.files.length} />
        {/* a phone's window is short, a row cut in half at its foot: the list reads as one that
            scrolls. Rows come in without moving the window, the folders you open scroll inside it */}
        <Window data-tree title="my-app" className="h-66.5 md:h-full">
          <div className="relative min-h-0 flex-1">
            <div
              data-list
              className="absolute inset-0 overflow-y-auto [scrollbar-color:var(--lp-ink)_var(--lp-paper)] [scrollbar-width:thin]"
            >
              {/* a name wider than its column, in a font still loading, breaks instead of spilling */}
              <Files className="rounded-none border-0 bg-transparent py-2 ps-2 pe-1 font-mono wrap-anywhere [&_.ms-2]:ms-1.5 [&_.ps-2]:ps-1 [&_button]:py-0.5 md:[&_button]:text-xs [&_svg]:text-lp-ink-2">
                {rows(plan.tree)}
              </Files>
            </div>
          </div>
        </Window>
      </div>,
    );
    // its window shares its cell with the other run's: switching keeps it
    editors.push(
      <Editor
        key={plan.id}
        id={`cli-${plan.id}`}
        sources={plan.sources}
        data-scene={i}
        inert={i > 0}
        className="col-start-1 row-start-3 mt-4 inert:invisible md:row-start-2 md:mt-6 md:aspect-video md:min-h-0 xl:col-start-4 xl:row-start-1 xl:mt-0 xl:w-full xl:self-stretch"
        page={
          // the page before your edit and after it, `data-edited` says which shows: only ever
          // hidden, never forced visible, so an inactive run's page stays unseen
          <div data-page data-edited className="group grid h-full *:col-start-1 *:row-start-1">
            <div className="group-data-edited:invisible">
              <Preview {...previews[plan.id].before} />
            </div>
            <div data-after className="group-not-data-edited:invisible">
              <Preview {...previews[plan.id].after} />
            </div>
          </div>
        }
      />,
    );
    // a character per span: typing shows them in place, so the command never reflows
    const text = `npx @fumadocs/cli ${plan.args}`;
    const characters: ReactNode[] = [];
    for (let n = 0; n < text.length; n++) {
      characters.push(
        <span key={n} style={{ '--i': n } as CSSProperties}>
          {text[n]}
        </span>,
      );
    }
    commands.push(
      <code
        key={plan.id}
        data-command
        data-scene={i}
        inert={i > 0}
        className="col-start-1 row-start-1 block inert:invisible *:[opacity:clamp(0,calc(var(--typed,999)_-_var(--i)),1)]"
      >
        {characters}
      </code>,
    );
    chips.push(
      <button key={plan.id} type="button" data-play={i} aria-pressed={i === 0} className={chip}>
        {plan.label}
      </button>,
    );
  }

  return (
    <Figure id="cli" aria-label="CLI" status={plans[0].done}>
      <div className="flex flex-col gap-8 px-(--lp-gutter) pt-16 pb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <FigureHeader lead={<Asked>{copy.cli.lead}</Asked>} title={copy.cli.title} />
        {/* the runs and the command share both edges: the stage's width on a phone and a tablet, the
            command's from 1024px, against the stage's right edge */}
        <div className="flex flex-col gap-3 lg:shrink-0">
          <div className="grid grid-cols-2 gap-2 in-data-static:hidden noscript:hidden">
            {chips}
          </div>
          <div className="flex max-w-full items-stretch border border-lp-line-strong bg-lp-paper">
            <div className="flex min-w-0 flex-1 gap-2 px-3 py-2.75 font-mono text-xs leading-5 sm:text-sm">
              <span aria-hidden className="text-lp-ink-2 select-none">
                $
              </span>
              {/* both commands in one place: the box keeps the size of the longer one */}
              <span className="relative grid min-w-0">
                {commands}
                <span
                  data-caret
                  aria-hidden
                  className="invisible absolute top-0 left-0 h-[1.1em] w-[0.6em] bg-current motion-reduce:animate-none"
                />
              </span>
            </div>
            <button
              type="button"
              data-replay
              aria-label="Run again"
              className="flex w-11 shrink-0 items-center justify-center border-s border-lp-line-strong transition-none hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none motion-reduce:hidden in-data-static:hidden noscript:hidden"
            >
              <RotateCcw aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <Stage>
        {/* the machine has a block of its own above your project; from 1280px it stands left of
            your project, its riser climbing to the hopper */}
        <div className="relative col-start-1 row-start-1 h-90 md:col-span-2 xl:contents">
          <div
            data-crate
            className={machine(
              'bottom-0 left-0.5 h-40 w-[min(180px,calc(50%-8px))] xl:right-full xl:left-auto xl:me-10 xl:h-37.5 xl:w-50',
            )}
          >
            <p
              data-label
              className="absolute bottom-4 left-4 z-6 flex flex-col gap-1 border border-lp-line-strong bg-lp-paper px-3 py-2 leading-none xl:bottom-3 xl:left-4.5 xl:py-1"
            >
              <code className="text-xs leading-none">fumadocs-ui</code>
              <code className="text-xs leading-none text-lp-orange">{pkg.version}</code>
            </p>
          </div>
          <p
            data-plate
            className={machine(
              'top-2 left-2 z-6 border border-lp-line-strong bg-lp-paper px-3 py-1 font-mono text-xs leading-none whitespace-nowrap text-lp-ink-2 xl:top-(--cli-top) xl:right-full xl:left-auto xl:-mt-20 xl:me-17',
            )}
          >
            fumadocs.dev/registry
          </p>
        </div>
        {cells}
        {editors}
        {/* clipped, the carried files can't take the rest of the page into layers (see steer) */}
        <div
          data-cards
          aria-hidden
          className="pointer-events-none absolute inset-0 z-5 overflow-clip"
        >
          {cards}
        </div>
      </Stage>
    </Figure>
  );
}
