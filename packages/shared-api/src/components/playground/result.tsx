'use client';
import { type ComponentProps, Fragment, type ReactNode, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { Segmented, SegmentedList, SegmentedPanel } from '../segmented';
import { iconButtonClassName, PanelHeader } from './panels';
import { cn } from '@/utils/cn';

function ClearButton({ onClick, className }: { onClick: () => void; className?: string }) {
  const t = useTranslations({ note: 'playground result display' });

  return (
    <button
      type="button"
      aria-label={t('Clear')}
      title={t('Clear')}
      className={cn(iconButtonClassName, className)}
      onClick={onClick}
    >
      <X />
    </button>
  );
}

/** a request without response, like a network error */
export function RequestError({
  message,
  url,
  onClear,
  ...rest
}: ComponentProps<'div'> & { message: string; url: string; onClear: () => void }) {
  const t = useTranslations({ note: 'playground result display' });

  return (
    <div {...rest} className={cn('flex min-h-0 flex-1 flex-col', rest.className)}>
      <PanelHeader>
        <span className="size-2 shrink-0 rounded-full bg-red-500" />
        <span className="text-[0.8125rem] font-medium">{t('Request Failed')}</span>
        <ClearButton onClick={onClear} className="ms-auto" />
      </PanelHeader>
      <div className="flex flex-col gap-3 overflow-auto p-4 text-sm">
        <p>{message}</p>
        <p className="font-mono text-xs break-all text-fd-muted-foreground">{url}</p>
        <p className="rounded-lg border bg-fd-secondary p-3 text-xs text-fd-muted-foreground">
          {t(
            'Check the server URL. If the API does not allow cross-origin requests from this site, a proxy is needed.',
          )}
        </p>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function useStatusInfo(status: number): { description: string; color: string } {
  const t = useTranslations({ note: 'playground status info' });
  const descriptions: Partial<Record<number, string>> = {
    200: t('OK'),
    201: t('Created'),
    202: t('Accepted'),
    204: t('No Content'),
    301: t('Moved Permanently'),
    302: t('Found'),
    304: t('Not Modified'),
    400: t('Bad Request'),
    401: t('Unauthorized'),
    403: t('Forbidden'),
    404: t('Not Found'),
    405: t('Method Not Allowed'),
    409: t('Conflict'),
    422: t('Unprocessable Content'),
    429: t('Too Many Requests'),
    500: t('Internal Server Error'),
    502: t('Bad Gateway'),
    503: t('Service Unavailable'),
  };

  if (status >= 200 && status < 300)
    return { color: 'bg-green-500', description: descriptions[status] ?? t('Successful') };
  if (status >= 300 && status < 400)
    return { color: 'bg-blue-500', description: descriptions[status] ?? t('Redirect') };
  return {
    color: status >= 400 && status < 500 ? 'bg-amber-500' : 'bg-red-500',
    description: descriptions[status] ?? t('Error'),
  };
}

/** the response of a request, with `children` as its body */
export function ResponseView({
  status,
  duration,
  size,
  url,
  headers,
  warning = false,
  actions,
  onClear,
  children,
  ...rest
}: ComponentProps<'div'> & {
  status: number;
  /** in milliseconds */
  duration: number;
  /** of the body in bytes, an empty body replaces `children` */
  size: number;
  url: string;
  /** shown in a tab beside the body */
  headers?: [name: string, value: string][];
  /** turns its indicator amber, like a successful response with errors */
  warning?: boolean;
  /** buttons before the clear button */
  actions?: ReactNode;
  onClear: () => void;
}) {
  const t = useTranslations({ note: 'playground result display' });
  const statusInfo = useStatusInfo(status);
  const [view, setView] = useState('body');

  return (
    <div {...rest} className={cn('flex min-h-0 flex-1 flex-col', rest.className)}>
      <Segmented value={view} onValueChange={setView} className="flex min-h-0 flex-1 flex-col">
        <PanelHeader>
          <span
            className={cn(
              'size-2 shrink-0 rounded-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:starting:scale-0',
              warning ? 'bg-amber-500' : statusInfo.color,
            )}
          />
          <p className="min-w-0 truncate text-[0.8125rem] font-medium">
            <span className="tabular-nums">{status}</span>{' '}
            <span className="font-normal text-fd-muted-foreground">{statusInfo.description}</span>
          </p>
          <p className="hidden shrink-0 text-xs text-fd-muted-foreground tabular-nums @md:block">
            {formatDuration(duration)} · {formatSize(size)}
          </p>
          {headers && (
            <SegmentedList
              className="ms-auto shrink-0"
              items={[
                { value: 'body', label: t('Body') },
                {
                  value: 'headers',
                  label: (
                    <>
                      {t('Headers')}
                      <span className="text-fd-muted-foreground tabular-nums">
                        {headers.length}
                      </span>
                    </>
                  ),
                },
              ]}
            />
          )}
          <div className={cn('flex shrink-0 items-center', !headers && 'ms-auto')}>
            {actions}
            <ClearButton onClick={onClear} />
          </div>
        </PanelHeader>
        <SegmentedPanel value="body" className="min-h-0 flex-1 overflow-auto">
          {size > 0 ? (
            children
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
              <p className="text-4xl font-light tracking-tight tabular-nums">{status}</p>
              <p className="text-sm text-fd-muted-foreground">{t('Empty response body')}</p>
            </div>
          )}
        </SegmentedPanel>
        {headers && (
          <SegmentedPanel value="headers" className="min-h-0 flex-1 overflow-auto">
            <p className="border-b px-4 py-2.5 font-mono text-xs break-all text-fd-muted-foreground">
              {url}
            </p>
            <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] font-mono text-xs">
              {headers.map(([name, value]) => (
                <Fragment key={name}>
                  <dt className="truncate border-b py-2 ps-4 pe-2 text-fd-muted-foreground">
                    {name}
                  </dt>
                  <dd className="border-b border-s px-3 py-2 break-all">{value}</dd>
                </Fragment>
              ))}
            </dl>
          </SegmentedPanel>
        )}
      </Segmented>
    </div>
  );
}
