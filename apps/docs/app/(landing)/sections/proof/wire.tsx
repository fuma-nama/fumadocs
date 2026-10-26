import Image from 'next/image';
import type { Quote } from '../../content';

/** testimonials as a notification feed */
export function Wire({ quotes }: { quotes: Quote[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
      {quotes.map((quote) => (
        <figure key={quote.name} className="flex flex-col border border-lp-line-strong bg-lp-paper">
          <blockquote className="flex-1 px-4 pt-3.5 pb-4 text-[15px] leading-normal text-pretty">
            {quote.message}
          </blockquote>
          <figcaption className="flex items-center gap-3 border-t border-lp-line px-4 py-2.5">
            <Image
              src={`${quote.avatar}?s=80`}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-10 shrink-0 border border-lp-line-strong grayscale"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{quote.name}</span>
              <span className="truncate text-[13px] text-lp-ink-2">{quote.role}</span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
