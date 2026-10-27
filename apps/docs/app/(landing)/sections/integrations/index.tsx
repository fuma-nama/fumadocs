import Link from 'next/link';
import { Figure, FigureHeader } from '../../ui/figure';
import { copy } from '../../content';
import { Board } from './board';
import { modules, more } from './data';
import { mechanisms } from './mechanisms';
import './integrations.css';

const loaded = `${modules.length} integrations loaded`;

export function Integrations() {
  return (
    <Figure id="integrations" aria-label="Integrations" status={loaded}>
      <Board
        modules={modules}
        mechanisms={mechanisms}
        loaded={loaded}
        header={<FigureHeader lead={copy.integrations.lead} title={copy.integrations.title} />}
      >
        <Marquee />
      </Board>
    </Figure>
  );
}

function Marquee() {
  const items = [];
  for (const item of more) {
    items.push(
      <li key={item.name}>
        <Link
          href={item.href}
          prefetch={false}
          className="flex h-11 items-center px-4 font-mono text-[13px] text-lp-ink-2 hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
        >
          {item.name}
        </Link>
      </li>,
    );
  }

  return (
    <div className="bt-more flex items-stretch">
      <p className="flex shrink-0 items-center gap-2 border-e border-lp-line px-(--lp-gutter) font-pixel text-[13px] motion-reduce:border-e-0">
        <span className="text-lp-orange">+{more.length}</span>
        <span className="text-lp-ink-2">more</span>
      </p>
      {/* the moving text keeps clear of the divider and the sheet's edge */}
      <div className="bt-marquee relative ms-3 me-(--lp-gutter) min-w-0 flex-1 overflow-clip motion-reduce:contents">
        <div className="bt-track flex w-max motion-reduce:contents">
          <ul className="flex motion-reduce:contents">{items}</ul>
          <ul aria-hidden inert className="flex motion-reduce:hidden">
            {items}
          </ul>
        </div>
      </div>
    </div>
  );
}
