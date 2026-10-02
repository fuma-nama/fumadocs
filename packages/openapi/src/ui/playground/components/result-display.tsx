'use client';
import { Fragment, type ReactNode, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ChevronDown, CircleX, DownloadIcon, SignpostIcon } from 'lucide-react';
import type { FetchResponseResult, FetchResult } from '@/playground/fetcher';
import { useStatusInfo } from '../status-info';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/utils/cn';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { useTranslations } from '@fuma-translate/react';
import { safeParse } from 'fast-content-type-parse';
import { cva } from 'class-variance-authority';
import type { BuiltinLanguage, SpecialLanguage } from 'shiki';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from 'shared-api/components/collapsible';

export interface ResultDisplayProps extends ComponentProps<'div'> {
  data: FetchResult;
  reset: () => void;
}

const panelVariants = cva(
  'flex flex-col gap-3 mt-2 px-3 py-2 border-y bg-fd-secondary text-fd-secondary-foreground',
);

export function DefaultResultDisplay({ data, reset, ...rest }: ResultDisplayProps) {
  const t = useTranslations({ note: 'playground result display' });

  if (data.type === 'client_error') {
    return (
      <div {...rest} className={cn(panelVariants(), rest.className)}>
        <div className="flex gap-1.5 items-center">
          <CircleX className="size-4 text-red-500" />
          <p className="text-sm font-medium me-auto">{t('Client Error')}</p>
          <button
            type="button"
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
            onClick={() => reset()}
          >
            {t('Close')}
          </button>
        </div>
        <p className="flex items-start gap-2 text-xs font-mono text-fd-muted-foreground break-all">
          <SignpostIcon className="size-4 shrink-0" />
          {data.url}
        </p>
        <p>{data.message}</p>
      </div>
    );
  }

  return <ResponseResult data={data} reset={reset} {...rest} />;
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

function ResponseResult({
  data,
  reset,
  ...rest
}: ComponentProps<'div'> & {
  data: FetchResponseResult;
  reset: () => void;
}) {
  const t = useTranslations({ note: 'playground result display' });
  const statusInfo = useStatusInfo(data.status);
  const [objectUrl, setObjectUrl] = useState<string>();
  const { parameters, type } = useMemo(
    () => safeParse(data.headers.get('Content-Type') ?? 'text/plain'),
    [data.headers],
  );

  useEffect(() => {
    const objectUrl = URL.createObjectURL(new Blob([data.body], { type }));
    setObjectUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [data.body, type]);

  let body: ReactNode;
  if (type.startsWith('image/')) {
    body = objectUrl && <ImageResult mime={type} src={objectUrl} />;
  } else if (data.body.byteLength > 0) {
    const lang = getTextFormat(type);

    if (lang) {
      body = <TextResult lang={lang} contentType={type} charset={parameters.charset} data={data} />;
    } else {
      body = (
        <div className="p-2 border rounded-lg bg-fd-card text-fd-card-foreground">
          {type && <p className="text-xs font-mono text-fd-muted-foreground mb-1">{type}</p>}
          <p className="font-medium">
            {t('Binary response body, {length} bytes', {
              variables: {
                length: String(data.body.byteLength),
              },
            })}
          </p>
        </div>
      );
    }
  }

  return (
    <div {...rest} className={cn(panelVariants(), rest.className)}>
      <div className="flex items-center gap-1.5">
        <statusInfo.icon className={cn('size-4 shrink-0', statusInfo.color)} />
        <p className="min-w-0 me-auto text-sm font-medium truncate">
          {data.status} {statusInfo.description}
        </p>
        {data.body.byteLength > 0 && (
          <a
            href={objectUrl}
            download={getFileName(data.headers)}
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'gap-2')}
          >
            <DownloadIcon className="size-3.5 text-fd-muted-foreground" />
            {t('Download')}
          </a>
        )}
        <button
          type="button"
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
          onClick={() => reset()}
        >
          {t('Close')}
        </button>
      </div>
      <p className="flex items-start gap-2 text-xs font-mono text-fd-muted-foreground break-all">
        <SignpostIcon className="size-4 shrink-0" />
        {data.url}
      </p>
      <ResponseHeaders headers={data.headers} />
      {body}
    </div>
  );
}

function ResponseHeaders({ headers }: { headers: Headers }) {
  const t = useTranslations({ note: 'playground result display' });
  const entries = Array.from(headers);
  if (entries.length === 0) return;

  return (
    <Collapsible>
      <CollapsibleTrigger className="group inline-flex w-fit items-center gap-1 text-xs font-medium text-fd-muted-foreground hover:text-fd-accent-foreground">
        {t('Headers')}
        <span className="font-normal">({entries.length})</span>
        <ChevronDown className="size-3.5 group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pt-2 font-mono text-xs">
          {entries.map(([name, value]) => (
            <Fragment key={name}>
              <dt className="text-fd-muted-foreground">{name}</dt>
              <dd className="break-all">{value}</dd>
            </Fragment>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TextResult({
  lang,
  charset,
  data,
  contentType,
}: {
  lang: BuiltinLanguage | SpecialLanguage;
  data: FetchResponseResult;
  contentType?: string;
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
      codeblock={{
        title: <span className="text-xs font-mono">{contentType}</span>,
      }}
    />
  );
}

function ImageResult({ mime, src }: { mime: string; src: string }) {
  return (
    <figure className="w-full p-1 bg-fd-card border rounded-lg shadow-sm">
      <figcaption className="text-xs text-fd-muted-foreground font-mono p-1 pb-2">
        {mime}
      </figcaption>
      <img src={src} alt="" className="w-full rounded-md" />
    </figure>
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
