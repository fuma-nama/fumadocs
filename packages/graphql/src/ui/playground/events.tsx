'use client';
import { memo } from 'react';
import { ArrowDownLeft, Radio, Trash2, TriangleAlert } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import {
  iconButtonClassName,
  PanelHeader,
  Placeholder,
} from 'shared-api/components/playground/panels';
import { DataEntry, LogList, LogTime, StatusEntry } from 'shared-api/components/playground/log';
import type { SubscriptionError } from '@/playground/subscription';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { cn } from '@/utils/cn';
import type { LogEntry, Playground } from './use-playground';
import { ErrorList, getResponseErrors } from './errors';

/** the events of subscription, the latest at the bottom */
export function EventLog({ playground }: { playground: Playground }) {
  const t = useTranslations({ note: 'graphql playground' });
  const { log } = playground;

  return (
    <>
      <PanelHeader>
        <h3 className="me-auto text-[0.8125rem] font-medium">{t('Events')}</h3>
        <button
          type="button"
          aria-label={t('Clear')}
          title={t('Clear')}
          disabled={log.length === 0}
          onClick={playground.clearLog}
          className={cn(iconButtonClassName, 'disabled:opacity-40')}
        >
          <Trash2 />
        </button>
      </PanelHeader>
      {log.length > 0 ? (
        <LogList label={t('Events')} entries={log}>
          {(entry) => <Entry key={entry.id} entry={entry} />}
        </LogList>
      ) : (
        <Placeholder icon={Radio}>{t('Waiting for events.')}</Placeholder>
      )}
    </>
  );
}

// entries don't change once added, a busy subscription re-renders only the new one
const Entry = memo(function Entry({ entry }: { entry: LogEntry }) {
  const t = useTranslations({ note: 'graphql playground' });
  if (entry.type === 'next') return <ResultEntry result={entry.data} time={entry.time} />;

  let text: string;
  let detail: string | undefined;
  if (entry.type === 'subscribed') {
    text = t('Subscribed');
    detail = entry.data as string;
  } else if (entry.type === 'completed') {
    text = t('Completed');
  } else if (entry.type === 'stopped') {
    text = t('Stopped');
  } else {
    text = t('Subscription failed');
    const error = entry.data as SubscriptionError;
    if (error.type === 'timeout') {
      detail = t('The server did not acknowledge the connection.');
    } else if (error.type === 'close') {
      detail = t('The connection closed with code {code}.', {
        variables: { code: String(error.code) },
      });
      if (error.reason) detail += ` ${error.reason}`;
    } else if (error.type === 'network') {
      // browsers hide why requests fail
      detail = `${error.message}\n${t('Check the URL, and whether the server accepts connections from this site.')}`;
    } else {
      detail = error.message;
    }
  }

  return (
    <StatusEntry
      label={text}
      detail={detail}
      time={entry.time}
      error={entry.type === 'error'}
      wrap={entry.type === 'error'}
    />
  );
});

function ResultEntry({ result, time }: { result: unknown; time: number }) {
  const t = useTranslations({ note: 'graphql playground' });
  const errors = getResponseErrors(result);
  const failed = errors.length > 0;
  const Icon = failed ? TriangleAlert : ArrowDownLeft;

  return (
    <DataEntry
      received
      summary={
        <>
          <Icon
            role="img"
            aria-label={failed ? t('Errors') : t('Result')}
            className={cn(
              'size-3.5 shrink-0',
              failed ? 'text-amber-500' : 'text-green-600 dark:text-green-400',
            )}
          />
          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              failed ? 'text-amber-700 dark:text-amber-300' : 'font-mono text-fd-muted-foreground',
            )}
          >
            {failed ? errors[0].message : JSON.stringify(result)}
          </span>
          <span className="text-fd-muted-foreground">
            <LogTime time={time} />
          </span>
        </>
      }
      details={() => (
        <div className="flex flex-col gap-2 px-3 pb-3">
          {failed && <ErrorList errors={errors} className="rounded-lg" />}
          <ClientCodeBlock
            lang="json"
            code={JSON.stringify(result, null, 2)}
            codeblock={{ className: 'my-0' }}
          />
        </div>
      )}
    />
  );
}
