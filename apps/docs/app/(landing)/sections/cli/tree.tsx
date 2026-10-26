import type { ReactNode } from 'react';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import type { Entry } from './data';

/** the rows, each carrying its path: the scene shows them as their files land */
function render(entries: Entry[]): ReactNode[] {
  const out: ReactNode[] = [];
  for (const entry of entries) {
    const data = { 'data-path': entry.path, 'data-added': entry.added || undefined };
    if (entry.children) {
      out.push(
        <Folder key={entry.path} name={entry.name} defaultOpen={entry.open} {...data}>
          {render(entry.children)}
        </Folder>,
      );
    } else {
      out.push(
        <File key={entry.path} name={entry.name} className="py-0.5 md:text-[13px]" {...data} />,
      );
    }
  }
  return out;
}

/**
 * Your project as the real `Files` component, rows a step tighter. The window has the stage's size,
 * not the list's: rows come in without moving it, and the folders you open scroll inside it. A name
 * wider than its column, in a font still loading, breaks instead of spilling out.
 */
export function Tree({ entries }: { entries: Entry[] }) {
  return (
    <div className="relative min-h-0 flex-1">
      <div
        data-list
        className="absolute inset-0 overflow-y-auto [scrollbar-color:var(--lp-ink)_var(--lp-paper)] [scrollbar-width:thin]"
      >
        <Files className="rounded-none border-0 bg-transparent py-2 ps-2 pe-1 font-mono wrap-anywhere [&_.ms-2]:ms-1.5 [&_.ps-2]:ps-1 [&_button]:py-0.5 md:[&_button]:text-[13px] [&_svg]:text-lp-ink-2">
          {render(entries)}
        </Files>
      </div>
    </div>
  );
}
