import Image from 'next/image';
import { showcases, vercel } from '@/lib/showcases';
import { address } from '../ui/site-tile';
import { Window } from '../ui/window';
import { copy, kinds } from './data';
import { Develop } from './develop';
import { Tour } from './tour';

const sizes = '(min-width: 1400px) 402px, (min-width: 1024px) 29vw, (min-width: 768px) 45vw, 90vw';

const row = 'flex items-center justify-between gap-3 px-3 font-mono text-xs';
const invert =
  'group-hover:bg-lp-ink group-hover:text-lp-paper group-focus-visible:bg-lp-ink group-focus-visible:text-lp-paper';

/** the featured sites as large windows on a desk, toured by a cursor once on screen */
export function Featured() {
  const windows = [];
  for (const site of showcases) {
    const kind = kinds[site.url];
    if (!kind || !site.image) continue;
    windows.push(
      <a
        key={site.url}
        data-stop=""
        href={site.url}
        target="_blank"
        rel="noreferrer noopener"
        className="group relative z-10 flex outline-offset-2 outline-lp-ink focus-visible:outline"
      >
        <Window
          title={
            <span data-title="" className={`-mx-2 block px-2 ${invert}`}>
              {site.name}
            </span>
          }
          className="w-full"
        >
          <span className="relative block aspect-[1.91/1] overflow-hidden">
            <Image src={site.image} alt="" fill sizes={sizes} className="object-cover" />
            <canvas
              aria-hidden
              className="pointer-events-none invisible absolute top-0 left-0 [image-rendering:pixelated]"
            />
          </span>
          <span className={`h-9 border-t border-lp-line-strong ${row} ${invert}`}>
            <span className="text-lp-ink-2 group-hover:text-lp-paper group-focus-visible:text-lp-paper">
              {kind}
            </span>
            <span>{address(site.url)} ↗</span>
          </span>
        </Window>
      </a>,
    );
  }

  return (
    <Develop>
      <Tour className="lp-dots border border-lp-line-strong p-4 sm:p-6 lg:p-10">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {windows}
          <div data-stop="" className="relative z-10 flex">
            <Window
              title={
                <span data-title="" className="-mx-2 inline-flex items-center gap-1.5 px-2">
                  <svg aria-hidden viewBox="0 0 74 64" className="h-2.5 w-3 fill-current">
                    <path d="M37.59.25 74.54 64.25H.64L37.59.25Z" />
                  </svg>
                  Vercel
                </span>
              }
              className="w-full"
            >
              <p className="px-4 py-3 text-sm leading-normal text-pretty">{copy.vercel}</p>
              {/* the rows share whatever height the desk row leaves */}
              <ul className="flex flex-1 flex-col border-t border-lp-line-strong">
                {vercel.map((item) => (
                  <li
                    key={item.url}
                    className="flex flex-1 flex-col border-b border-lp-line last:border-b-0"
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={`group min-h-9 flex-1 ${row} hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none`}
                    >
                      <span className="font-sans text-[15px] font-medium">{item.name}</span>
                      <span className="text-lp-ink-2 group-hover:text-lp-paper group-focus-visible:text-lp-paper">
                        {kinds[item.url]} ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Window>
          </div>
        </div>
      </Tour>
    </Develop>
  );
}
