import type { CSSProperties, ReactNode } from 'react';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { owner, repo } from '@/lib/github';
import { type ShowcaseObject, showcases, vercel } from '@/lib/showcases';
import { copy } from '../../content';
import { copy as showcase } from '../../showcase/data';
import { VercelLinks, VercelTitle } from '../../showcase/wall';
import { Figure, FigureHeader } from '../../ui/figure';
import { Shadow, Window } from '../../ui/window';
import { getContributorCount, getDownloads, getStars } from './data';
import { type Reading, Stage } from './stage';

/** a window's left, top and width, if it sizes with its box: on phones, then from 1024px */
interface Place {
  phone: readonly string[];
  desk: readonly string[];
}

/**
 * The sites a reader knows on sight, in the order they land, so each stacks over the ones before:
 * on phones a cascading pile from the top down, placed as shares of the pile's width; from 1024px
 * a drift from the upper left toward the right, as shares of the desk's, landing row by row.
 * shadcn/ui's title bar lands on Better Auth's lower right corner; the wire to shadcn's quote
 * leaves shadcn/ui's foot. A window on the pile is never narrower than its title.
 */
const PICKS: (Place & { name: string })[] = [
  { name: 'Zod', phone: ['0%', '0%', '56%'], desk: ['0.9%', '3%', '18.5%'] },
  { name: 'Prisma', phone: ['42%', '27%', '58%'], desk: ['23.6%', '0%', '21.5%'] },
  { name: 'HeroUI', phone: ['4%', '60%', '50%'], desk: ['52%', '6%', '16%'] },
  { name: 'nuqs', phone: ['48%', '86%', '52%'], desk: ['7.5%', '12%', '20%'] },
  {
    name: 'Better Auth',
    phone: ['2%', '115%', 'max(50%, 178px)'],
    desk: ['30%', '15.5%', '18%'],
  },
  { name: 'shadcn/ui', phone: ['36%', '134%', '64%'], desk: ['43%', '25.7%', '23.5%'] },
];
/** the widest pick's width */
const sizes = '(min-width: 1400px) 314px, (min-width: 1024px) 24vw, min(64vw, 400px)';

/**
 * The rest of the desk, on phones in px in a box of their own, from 1024px as shares of the
 * desk's width: three more sites as a pile, the way to the showcase over it at the lower left, and
 * the site a quote's wire leaves from, ArkType, at the right.
 */
const PILE: Place[] = [
  { phone: ['0px', '8px'], desk: ['5.2%', '29.6%'] },
  { phone: ['44px', '0px'], desk: ['10%', '28.1%'] },
  { phone: ['92px', '10px'], desk: ['15.2%', '30.2%'] },
];
const ALL: Place = { phone: ['20px', '52px'], desk: ['8.5%', '33.4%'] };
const SOURCE = {
  name: 'ArkType',
  phone: ['152px', '14px', '124px'],
  desk: ['67.8%', '38%', '12.5%'],
};

/** a placed window: in its box by its left and top, the margin's share of the box's width */
const placed = 'absolute top-0 left-(--x) mt-(--y) lg:left-(--lg-x) lg:mt-(--lg-y)';
const sized = 'w-(--w) lg:w-(--lg-w)';

function place({ phone, desk }: Place): CSSProperties {
  return {
    '--x': phone[0],
    '--y': phone[1],
    '--w': phone[2],
    '--lg-x': desk[0],
    '--lg-y': desk[1],
    '--lg-w': desk[2],
  } as CSSProperties;
}

/** a site's screenshot as a file on the desk */
function file(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** a window's title that inverts while its window is pointed at */
function Title({ children }: { children: ReactNode }) {
  return (
    <span className="-mx-2 px-2 group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
      {children}
    </span>
  );
}

interface PickProps {
  site: ShowcaseObject;
  title: ReactNode;
  style: CSSProperties;
  sizes: string;
}

/** a site's window, its screenshot under the title: the link to the site */
function Pick({ site, title, style, sizes }: PickProps) {
  return (
    <a
      href={site.url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={site.name}
      data-window={file(site.name)}
      style={style}
      className={cn(
        placed,
        sized,
        'group isolate outline-offset-2 outline-lp-ink focus-visible:z-10 focus-visible:outline',
      )}
    >
      <Shadow />
      <Window title={<Title>{title}</Title>}>
        <span className="relative block aspect-og overflow-hidden">
          {site.image && (
            <Image src={site.image} alt="" fill sizes={sizes} className="object-cover" />
          )}
        </span>
      </Window>
    </a>
  );
}

const box = 'relative size-1.5 border border-lp-line-strong bg-lp-paper';

/** a tiny window on the pile: a site's screenshot under a bar with no title, not a link */
function Small({ image, index }: { image: StaticImageData | string; index: number }) {
  return (
    <span
      aria-hidden
      data-window={`pile-${index}`}
      style={place(PILE[index])}
      className={cn(
        placed,
        'flex h-14.5 w-21 flex-col overflow-hidden border border-lp-line-strong bg-lp-paper shadow-[1px_1px_0_var(--lp-ink-2)]',
      )}
    >
      <span className="relative flex h-3 shrink-0 items-center justify-between border-b border-lp-line-strong px-0.5">
        <span className="lp-pinstripe absolute inset-x-0.5 inset-y-0" />
        <span className={box} />
        <span className={box} />
      </span>
      <span className="relative flex-1">
        <Image src={image} alt="" fill sizes="84px" className="object-cover" />
      </span>
    </span>
  );
}

export async function Proof() {
  const [stars, downloads, contributors] = await Promise.all([
    getStars(),
    getDownloads(),
    getContributorCount(),
  ]);
  const picks: ReactNode[] = [];
  const picked = new Set<string>([SOURCE.name]);
  for (const pick of PICKS) {
    const site = showcases.find((item) => item.name === pick.name);
    if (!site) continue;
    picked.add(site.name);
    picks.push(
      <Pick
        key={site.url}
        site={site}
        title={`${file(site.name)}.png`}
        style={place(pick)}
        sizes={sizes}
      />,
    );
  }
  // the next sites with screenshots
  const pile: ReactNode[] = [];
  for (const site of showcases) {
    if (pile.length === PILE.length) break;
    if (site.image && !picked.has(site.name))
      pile.push(<Small key={site.url} image={site.image} index={pile.length} />);
  }
  const source = showcases.find((item) => item.name === SOURCE.name);
  const online = showcases.length + vercel.length;
  const status = `${online} sites online`;

  const repository = `${owner}/${repo}`;
  const readings: Reading[] = [];
  if (stars !== undefined)
    readings.push({ label: 'GitHub stars', value: stars, source: repository });
  if (downloads !== undefined)
    readings.push({ label: 'Weekly downloads', value: downloads, source: 'fumadocs-core' });
  if (contributors !== undefined)
    readings.push({ label: 'Contributors', value: contributors, source: repository });

  return (
    <Figure
      id="proof"
      aria-label="Showcase"
      status={status}
      className="flex flex-col px-(--lp-gutter) py-(--lp-section)"
    >
      <Stage
        title={<FigureHeader title={copy.proof.title} />}
        readings={readings}
        status={status}
        picks={picks}
        vercel={
          <div
            data-window="vercel"
            className="relative isolate w-full max-w-105 lg:absolute lg:top-0 lg:left-[min(72%,100%_-_max(25%,300px))] lg:mt-[10%] lg:w-[max(25%,300px)]"
          >
            <Shadow />
            <Window title={<VercelTitle className="font-pixel text-[13.16px] antialiased" />}>
              <p className="p-3 text-sm/5 text-pretty">{showcase.vercel}</p>
              <ul className="flex flex-col border-t border-lp-line-strong [&_a]:py-3">
                <VercelLinks />
              </ul>
            </Window>
          </div>
        }
        rest={
          <>
            {pile}
            {source && (
              <Pick
                site={source}
                title={<span className="font-pixel text-[13.16px] antialiased">{source.name}</span>}
                style={place(SOURCE)}
                sizes="(min-width: 1400px) 167px, (min-width: 1024px) 12.5vw, 124px"
              />
            )}
            <Link
              href="/showcase"
              data-window="all"
              style={place(ALL)}
              className={cn(
                placed,
                'group isolate w-60 outline-offset-2 outline-lp-ink focus-visible:outline',
              )}
            >
              <Shadow />
              <Window title={<Title>showcase</Title>} className="h-24">
                <span className="flex flex-1 flex-col justify-center gap-1 px-3 group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper">
                  <span className="font-pixel text-[13.16px] leading-4 text-lp-ink-2 antialiased group-hover:text-lp-paper group-focus-visible:text-lp-paper">
                    {picks.length} of {online}
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    See all {online} sites
                    <ArrowRight aria-hidden className="size-3.5" />
                  </span>
                </span>
              </Window>
            </Link>
          </>
        }
      />
    </Figure>
  );
}
