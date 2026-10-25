import type { ReactNode } from 'react';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import type { Entry } from './data';

function render(entries: Entry[]): ReactNode[] {
  const out: ReactNode[] = [];
  for (const entry of entries) {
    if (entry.children) {
      out.push(
        <Folder
          key={entry.path}
          name={entry.name}
          defaultOpen={entry.open}
          data-path={entry.path}
          data-added={entry.added || undefined}
        >
          {render(entry.children)}
        </Folder>,
      );
    } else {
      out.push(
        <File
          key={entry.path}
          name={entry.name}
          data-path={entry.path}
          data-added={entry.added || undefined}
          className="py-0.5"
        />,
      );
    }
  }
  return out;
}

/** your project as the real `Files` component, rows a step tighter */
export function Tree({ entries }: { entries: Entry[] }) {
  return (
    <Files className="rounded-none border-0 bg-transparent px-2 py-2 font-mono [&_button]:py-0.5 [&_.ps-2]:ps-1.5 [&_svg]:text-lp-ink-2">
      {render(entries)}
    </Files>
  );
}
