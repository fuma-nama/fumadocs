'use client';
import { type ReactNode, useState } from 'react';
import { cn } from '@/utils/cn';

export type ConnectionStatus = 'closed' | 'connecting' | 'open';

/** the state of a connection, it pops when `activity` changes, like the light of a network port */
export function StatusDot({
  status,
  activity,
  label,
  className,
}: {
  status: ConnectionStatus;
  activity?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      key={activity}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={cn(
        'size-2 shrink-0 rounded-full transition-[background-color,scale] duration-300',
        status === 'closed' && 'bg-fd-muted-foreground/50',
        status === 'connecting' && 'bg-amber-500 motion-safe:animate-pulse',
        status === 'open' && 'bg-green-500 ring-3 ring-green-500/20 motion-safe:starting:scale-150',
        className,
      )}
    />
  );
}

export interface LogEntryBase {
  /** unique in the log */
  id: number;
  time: number;
}

/** older entries are dropped, a busy connection can send many messages */
const maxEntries = 500;
let nextId = 0;

/** an update of a log, adding an entry that happens now */
export function addLogEntry<T extends LogEntryBase>(entry: Omit<T, 'id' | 'time'>) {
  const item = { ...entry, id: nextId++, time: Date.now() } as T;
  return (log: T[]) => [...(log.length < maxEntries ? log : log.slice(1)), item];
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function LogTime({ time }: { time: number }) {
  return <time className="shrink-0 tabular-nums">{timeFormat.format(time)}</time>;
}

/** the entries of a live log, the latest at the bottom */
export function LogList<T>({
  label,
  entries,
  children,
}: {
  label: string;
  entries: T[];
  /** renders an entry with its `key` */
  children: (entry: T) => ReactNode;
}) {
  const items: ReactNode[] = [];
  // a reversed column keeps the scroll at the bottom as entries arrive, unless readers scroll up
  for (let i = entries.length - 1; i >= 0; i--) items.push(children(entries[i]));

  return (
    <div
      role="log"
      aria-label={label}
      className="fd-scroll-container flex min-h-0 flex-1 flex-col-reverse overflow-y-auto py-1"
    >
      {items}
    </div>
  );
}

/** a change of connection, like opened or failed */
export function StatusEntry({
  label,
  detail,
  time,
  error = false,
  wrap = false,
}: {
  label: ReactNode;
  detail?: string;
  time: number;
  error?: boolean;
  /** wrap the detail on up to three lines, instead of truncating it */
  wrap?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-2 px-4 py-1.5 text-xs text-fd-muted-foreground motion-safe:transition-opacity motion-safe:duration-300 motion-safe:starting:opacity-0',
        error && 'text-red-600 dark:text-red-400',
      )}
    >
      <span className="shrink-0 font-medium">{label}</span>
      <span
        className={cn(
          'min-w-0 flex-1 font-mono',
          wrap ? 'line-clamp-3 whitespace-pre-wrap wrap-break-word' : 'truncate',
        )}
        title={detail}
      >
        {detail}
      </span>
      <LogTime time={time} />
    </div>
  );
}

/** data sent or received, it expands to `details` */
export function DataEntry({
  received,
  disabled,
  summary,
  details,
}: {
  /** it came from the other side, and slides in from the start */
  received: boolean;
  disabled?: boolean;
  /** the content of its row */
  summary: ReactNode;
  /** rendered when expanded */
  details: () => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        'border-b border-fd-border/60 motion-safe:transition-[opacity,translate] motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:starting:opacity-0',
        // they come from the side of sender
        received ? 'motion-safe:starting:-translate-x-2' : 'motion-safe:starting:translate-x-2',
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-2 text-start text-xs transition-colors hover:bg-fd-accent/40 focus-visible:bg-fd-accent/40 focus-visible:outline-none"
      >
        {summary}
      </button>
      {open && details()}
    </div>
  );
}
