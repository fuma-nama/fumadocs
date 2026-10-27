import Link from 'next/link';
import { Figure, FigureHeader } from '../../ui/figure';
import { copy } from '../../content';
import { Board } from './board';
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
        header={<FigureHeader lead={copy.integrations.lead} title={copy.integrations.title} />}
      >
        <More />
      </Board>
    </Figure>
  );
}

/** the further integrations, each line starting on the gutter, its highlight bleeding past it */
function More() {
  const items = [];
  for (const item of more) {
    items.push(
      <li key={item.name}>
        <Link
          href={item.href}
          prefetch={false}
          className="flex h-9 items-center px-3 text-sm text-lp-ink-2 pointer-coarse:h-11 hover:bg-lp-ink hover:text-lp-paper focus-visible:bg-lp-ink focus-visible:text-lp-paper focus-visible:outline-none"
        >
          {item.name}
        </Link>
      </li>,
    );
  }

  return (
    <div className="px-(--lp-gutter) py-3">
      <ul className="-mx-3 flex flex-wrap">
        <li className="flex h-9 items-center gap-2 px-3 text-sm pointer-coarse:h-11">
          <span className="font-medium">+{more.length}</span>
          <span className="text-lp-ink-2">more</span>
        </li>
        {items}
      </ul>
    </div>
  );
}
