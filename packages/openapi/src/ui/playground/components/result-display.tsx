'use client';
import { type ComponentProps, Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { DownloadIcon, FileIcon, X } from 'lucide-react';
import type { FetchResponseResult, FetchResult } from '@/playground/fetcher';
import { useStatusInfo } from '../status-info';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import type { CodeBlockProps } from 'fumadocs-ui/components/codeblock';
import { cn } from '@/utils/cn';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { useTranslations } from '@fuma-translate/react';
import { safeParse } from 'fast-content-type-parse';
import type { BuiltinLanguage, SpecialLanguage } from 'shiki';
import { Segmented, SegmentedList, SegmentedPanel } from './segmented';

export interface ResultDisplayProps extends ComponentProps<'div'> {
  data: FetchResult;
  /** how long the request took, in milliseconds */
  duration?: number;
  reset: () => void;
}

export const iconButtonClassName = cn(
  buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
  'text-fd-muted-foreground [&_svg]:size-3.5',
);

/** a code block filling its panel */
export const panelCodeBlock: CodeBlockProps = {
  className: 'h-full rounded-none border-0 bg-transparent shadow-none',
  viewportProps: { className: 'h-full max-h-none' },
};

export function PanelHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('flex h-10 shrink-0 items-center gap-2.5 border-b ps-4 pe-1.5', className)}
    />
  );
}

export function DefaultResultDisplay({ data, duration, reset, ...rest }: ResultDisplayProps) {
  const t = useTranslations({ note: 'playground result display' });

  if (data.type === 'client_error') {
    return (
      <div {...rest} className={cn('flex min-h-0 flex-1 flex-col', rest.className)}>
        <PanelHeader>
          <span className="size-2 shrink-0 rounded-full bg-red-500" />
          <span className="text-[0.8125rem] font-medium">{t('Request Failed')}</span>
          <button
            type="button"
            aria-label={t('Clear')}
            className={cn(iconButtonClassName, 'ms-auto')}
            onClick={reset}
          >
            <X />
          </button>
        </PanelHeader>
        <div className="flex flex-col gap-3 overflow-auto p-4 text-sm">
          <p>{data.message}</p>
          <p className="font-mono text-xs break-all text-fd-muted-foreground">{data.url}</p>
          <p className="rounded-lg border bg-fd-secondary p-3 text-xs text-fd-muted-foreground">
            {t(
              'Check the server URL. If the API does not allow cross-origin requests from this site, a proxy is needed.',
            )}
          </p>
        </div>
      </div>
    );
  }

  return <ResponseResult data={data} duration={duration} reset={reset} {...rest} />;
}

function getTextFormat(mime: string): BuiltinLanguage | SpecialLanguage | null {
  switch (mime) {
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types
    case 'application/json':
      return 'json';
    case 'text/html':
      return 'html';
    case 'text/css':
      return 'css';
    case 'text/csv':
      return 'csv';
    case 'application/javascript':
    case 'application/x-javascript':
      return 'js';
    case 'application/xml':
      return 'xml';
  }

  if (mime.endsWith('+json')) return 'json';
  if (mime.endsWith('+xml')) return 'xml';
  if (mime.startsWith('text/')) return 'text';
  return null;
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ResponseResult({
  data,
  duration,
  reset,
  ...rest
}: ComponentProps<'div'> & {
  data: FetchResponseResult;
  duration?: number;
  reset: () => void;
}) {
  const t = useTranslations({ note: 'playground result display' });
  const statusInfo = useStatusInfo(data.status);
  const [view, setView] = useState('body');
  const [objectUrl, setObjectUrl] = useState<string>();
  const { parameters, type } = useMemo(
    () => safeParse(data.headers.get('Content-Type') ?? 'text/plain'),
    [data.headers],
  );
  const headers = useMemo(() => Array.from(data.headers), [data.headers]);
  const size = data.body.byteLength;

  useEffect(() => {
    const objectUrl = URL.createObjectURL(new Blob([data.body], { type }));
    setObjectUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [data.body, type]);

  let body: ReactNode;
  if (type.startsWith('image/')) {
    body = objectUrl && (
      <div className="flex min-h-full items-center justify-center p-4">
        <img src={objectUrl} alt="" className="max-w-full rounded-lg border" />
      </div>
    );
  } else if (size > 0) {
    const lang = getTextFormat(type);

    if (lang) {
      body = <TextResult lang={lang} charset={parameters.charset} data={data} />;
    } else {
      body = (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
          <FileIcon className="size-5 text-fd-muted-foreground" />
          <p className="text-sm font-medium">
            {t('Binary response body, {length} bytes', {
              variables: {
                length: String(size),
              },
            })}
          </p>
          {type && <p className="font-mono text-xs text-fd-muted-foreground">{type}</p>}
        </div>
      );
    }
  } else {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-4xl font-light tracking-tight tabular-nums">{data.status}</p>
        <p className="text-sm text-fd-muted-foreground">{t('Empty response body')}</p>
      </div>
    );
  }

  return (
    <div {...rest} className={cn('flex min-h-0 flex-1 flex-col', rest.className)}>
      <Segmented value={view} onValueChange={setView} className="flex min-h-0 flex-1 flex-col">
        <PanelHeader>
          <span
            className={cn(
              'size-2 shrink-0 rounded-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:starting:scale-0',
              statusInfo.color,
            )}
          />
          <p className="min-w-0 truncate text-[0.8125rem] font-medium">
            <span className="tabular-nums">{data.status}</span>{' '}
            <span className="font-normal text-fd-muted-foreground">{statusInfo.description}</span>
          </p>
          <p className="hidden shrink-0 text-xs text-fd-muted-foreground tabular-nums @md:block">
            {duration !== undefined && `${formatDuration(duration)} · `}
            {formatSize(size)}
          </p>
          <SegmentedList
            className="ms-auto shrink-0"
            items={[
              { value: 'body', label: t('Body') },
              {
                value: 'headers',
                label: (
                  <>
                    {t('Headers')}
                    <span className="text-fd-muted-foreground tabular-nums">{headers.length}</span>
                  </>
                ),
              },
            ]}
          />
          <div className="flex shrink-0 items-center">
            {size > 0 && (
              <a
                href={objectUrl}
                download={getFileName(data.headers)}
                aria-label={t('Download')}
                title={t('Download')}
                className={iconButtonClassName}
              >
                <DownloadIcon />
              </a>
            )}
            <button
              type="button"
              aria-label={t('Clear')}
              title={t('Clear')}
              className={iconButtonClassName}
              onClick={reset}
            >
              <X />
            </button>
          </div>
        </PanelHeader>
        <SegmentedPanel value="body" className="min-h-0 flex-1 overflow-auto">
          {body}
        </SegmentedPanel>
        <SegmentedPanel value="headers" className="min-h-0 flex-1 overflow-auto">
          <p className="border-b px-4 py-2.5 font-mono text-xs break-all text-fd-muted-foreground">
            {data.url}
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
      </Segmented>
    </div>
  );
}

function TextResult({
  lang,
  charset,
  data,
}: {
  lang: BuiltinLanguage | SpecialLanguage;
  data: FetchResponseResult;
  charset?: string;
}) {
  const code = useMemo(() => {
    let out: string;
    if (charset) {
      try {
        out = new TextDecoder(charset).decode(data.body);
      } catch {}
    }

    out ??= new TextDecoder('utf-8').decode(data.body);
    if (lang === 'json') {
      try {
        out = JSON.stringify(JSON.parse(out), null, 2);
      } catch {}
    }

    return out;
  }, [lang, charset, data.body]);

  return (
    <ClientCodeBlock
      lang={code.length > 5000 ? 'text' : lang}
      code={code}
      codeblock={panelCodeBlock}
    />
  );
}

/**
 * The file name from `Content-Disposition`, preferring `filename*` (RFC 6266), without directories.
 */
function getFileName(headers: Headers): string {
  const disposition = headers.get('Content-Disposition') ?? '';
  const extended = /(?:^|;)\s*filename\*\s*=\s*[^']*'[^']*'([^\s;"]+)/i.exec(disposition);
  let name: string | undefined;

  if (extended) {
    try {
      name = decodeURIComponent(extended[1]);
    } catch {}
  }

  if (!name) {
    const match = /(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"\\])*)"|([^\s;]+))/i.exec(disposition);
    name = match?.[1]?.replace(/\\(.)/g, '$1') ?? match?.[2];
  }

  return name?.replace(/^.*[/\\]/, '') || 'response';
}
