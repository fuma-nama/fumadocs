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
      status={`${modules.length} integrations loaded`}
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
 * The board's last row: the further integrations rolling by after their count, a copy of the list
 * behind it. Pointed at, it holds still; a link focused from the keyboard brings it back to its
 * start, scrolled to show the link. A wrap with reduced motion.
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
      <p className="flex shrink-0 items-center border-e border-lp-line px-(--lp-gutter) font-pixel text-sm text-lp-orange">
        +{more.length} more
      </p>
      <div className="me-(--lp-gutter) min-w-0 flex-1 overflow-x-clip group-data-keyed/more:overflow-x-hidden">
        <div className="bt-marquee flex w-max group-hover/more:paused group-data-keyed/more:animate-none motion-reduce:w-auto">
          <ul className="flex motion-reduce:flex-wrap">{items}</ul>
          <ul aria-hidden inert className="flex motion-reduce:hidden">
            {items}
          </ul>
        </div>
      </div>
    </Keyed>
  );
}
