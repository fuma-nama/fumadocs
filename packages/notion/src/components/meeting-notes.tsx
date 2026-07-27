import { NotebookPen } from 'lucide-react';
import type { ReactNode } from 'react';
import type { NotionBlockOfType } from '../blocks';
import { NotionRichText } from '../rich-text';

type MeetingNotes = NotionBlockOfType<'meeting_notes'>['meeting_notes'];

/**
 * Also used for `transcription`, which carries the same shape.
 *
 * The title is deliberately not a heading element: meeting notes are indexed as content rather
 * than headings, so promoting them would add outline entries the table of contents never lists.
 */
export function NotionMeetingNotes({
  value,
  children,
}: {
  value: MeetingNotes;
  children: ReactNode;
}) {
  const status = value.status?.replaceAll('_', ' ');
  const { calendar_event: event } = value;

  return (
    <section
      className="my-5 rounded-xl border border-fd-border bg-fd-card p-4 text-fd-card-foreground"
      data-notion-block="meeting-notes"
    >
      <header className="mb-4 border-b border-fd-border pb-3">
        <div className="flex items-center gap-2.5">
          <NotebookPen aria-hidden="true" className="size-5 shrink-0 text-fd-muted-foreground" />
          <p className="m-0 text-xl font-semibold text-balance" data-notion-meeting-title="">
            {value.title && value.title.length > 0 ? (
              <NotionRichText value={value.title} />
            ) : (
              'Meeting notes'
            )}
          </p>
        </div>
        {status ? (
          <span
            className="mt-2 inline-block rounded-full bg-fd-muted px-2 py-0.5 text-xs text-fd-muted-foreground"
            data-notion-meeting-status=""
          >
            {status}
          </span>
        ) : null}
        {event ? (
          <p className="mt-1.5 mb-0 text-sm text-fd-muted-foreground">
            <time dateTime={event.start_time}>{formatDateTime(event.start_time)}</time>
            <span aria-hidden="true"> – </span>
            <time dateTime={event.end_time}>{formatDateTime(event.end_time)}</time>
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}
