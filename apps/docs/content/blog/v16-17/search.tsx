'use client';
import type { CSSProperties, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Figure, Scenes, enter, useSteps } from './figure';

const header = ['Option', 'Default'];
const rows = [
  ['dir', "'docs'"],
  ['baseUrl', "'/'"],
  ['i18n', '-'],
];
const query = 'baseUrl';

const captions = [
  'A table in your page.',
  '16.16 made each cell a record, so searching baseUrl found the cell alone.',
  '16.17 makes each row a record, with its header.',
  'Now searching baseUrl finds its row, shown as a table.',
];

function Highlight({ children }: { children: string }) {
  return children === query ? (
    <span className="font-medium underline underline-offset-2">{children}</span>
  ) : (
    children
  );
}

function MiniTable({
  body,
  className,
  style,
}: {
  body: string[][];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-lg border bg-fd-background',
        className,
      )}
      style={style}
    >
      {header.map((cell) => (
        <p
          key={cell}
          className="border-b bg-fd-secondary px-3 py-1.5 font-sans text-fd-muted-foreground"
        >
          {cell}
        </p>
      ))}
      {body.map((row, i) =>
        row.map((cell, j) => (
          <p key={`${i}-${j}`} className={cn('px-3 py-1.5', i > 0 && 'border-t')}>
            <Highlight>{cell}</Highlight>
          </p>
        )),
      )}
    </div>
  );
}

/** the search dialog with the results of `query` */
function Dialog({ index, children }: { index: number; children: ReactNode }) {
  const motion = enter(index);

  return (
    <div
      className={cn(
        'w-full max-w-80 overflow-hidden rounded-xl border bg-fd-popover font-sans shadow-lg',
        motion.className,
      )}
      style={motion.style}
    >
      <p className="flex items-center gap-2 border-b px-3 py-2 text-sm">
        <Search className="size-4 text-fd-muted-foreground" />
        {query}
      </p>
      <div className="p-2">
        <p className="px-1 text-xs text-fd-muted-foreground">Docs › Source API</p>
        <p className="mb-1.5 px-1 text-sm font-medium">Loader</p>
        <div className="font-mono">{children}</div>
      </div>
    </div>
  );
}

export function TableRecords() {
  const steps = useSteps(captions);
  const table = enter(0);
  const scenes: ReactNode[] = [
    <MiniTable
      key="table"
      body={rows}
      className={cn('w-full max-w-72', table.className)}
      style={table.style}
    />,
    <div key="cells" className="flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {[header, ...rows].flat().map((cell, i) => {
          const motion = enter(i);
          return (
            <span
              key={i}
              className={cn(
                'rounded-md border bg-fd-background px-2 py-0.5',
                cell === query
                  ? 'border-fd-foreground/40 bg-fd-accent'
                  : i < 2 && 'font-sans text-fd-muted-foreground',
                motion.className,
              )}
              style={motion.style}
            >
              <Highlight>{cell}</Highlight>
            </span>
          );
        })}
      </div>
      <Dialog index={9}>
        <p className="ms-1.5 border-s py-1 ps-3">
          <Highlight>{query}</Highlight>
        </p>
      </Dialog>
    </div>,
    <div key="rows" className="grid w-full gap-2 sm:grid-cols-3">
      {rows.map((row, i) => {
        const motion = enter(i);
        return (
          <MiniTable
            key={i}
            body={[row]}
            className={cn(row[0] === query && 'border-fd-foreground/40', motion.className)}
            style={motion.style}
          />
        );
      })}
    </div>,
    <Dialog key="dialog" index={0}>
      <MiniTable body={[rows[1]]} {...enter(2)} />
    </Dialog>,
  ];

  return (
    <Figure steps={steps}>
      <Scenes step={steps.step} className="min-h-56">
        {scenes}
      </Scenes>
    </Figure>
  );
}
