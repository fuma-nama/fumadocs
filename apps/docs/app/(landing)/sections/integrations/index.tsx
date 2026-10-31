import Link from 'next/link';
import { Figure, FigureHeader } from '../../ui/figure';
import { copy } from '../../content';
import { Board, Keyed } from './board';
import { modules, more } from './data';
import { mechanisms } from './mechanisms';
import './integrations.css';

export function Integrations() {
  return (
    <Figure
      id="integrations"
      aria-label="Integrations"
      status={`${modules.length + more.length} integrations loaded`}
    >
      <Board
        modules={modules}
        mechanisms={mechanisms}
        header={<FigureHeader title={copy.integrations.title} />}
      >
        <More />
      </Board>
    </Figure>
  );
}

/**
 * The board's last row: the further integrations after their count, as many whole names as fit on
 * its line. A link focused from the keyboard is scrolled into view.
 */
function More() {
  const items = [];
  for (const item of more) {
    items.push(
      <li key={item.name}>
        <Link
          href={item.href}
          prefetch={false}
          className="flex h-11 items-center px-3 text-sm text-lp-ink-2 hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
        >
          {item.name}
        </Link>
      </li>,
    );
  }

  return (
    <Keyed className="group/more flex">
      <p className="flex shrink-0 items-center border-e border-lp-line px-(--lp-gutter) font-pixel text-[13.16px] leading-4 text-lp-orange antialiased">
        +{more.length} more
      </p>
      {/* the names that don't fit wrap out of sight, scrolled into it from the keyboard */}
      <ul className="me-(--lp-gutter) flex h-11 min-w-0 flex-1 flex-wrap overflow-clip group-data-keyed/more:overflow-hidden">
        {items}
      </ul>
    </Keyed>
  );
}
