'use client';
import { ReactNode, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { CircleX } from 'lucide-react';
import type { FetchResponseResult, FetchResult } from '@/playground/fetcher';
import { useStatusInfo } from '../status-info';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { cn } from '@/utils/cn';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { useTranslations, withReplacements } from '@/ui/client/i18n';
import { safeParse } from 'fast-content-type-parse';
import { cva } from 'class-variance-authority';
import type { BuiltinLanguage, SpecialLanguage } from 'shiki';

export interface ResultDisplayProps extends ComponentProps<'div'> {
  data: FetchResult;
  reset: () => void;
}

const panelVariants = cva(
  'flex flex-col gap-2 mt-2 px-3 py-2 border-y bg-fd-secondary text-fd-secondary-foreground',
);

export function DefaultResultDisplay({ data, reset, ...rest }: ResultDisplayProps) {
  const t = useTranslations();

  if (data.type === 'client_error') {
    return (
      <div {...rest} className={cn(panelVariants(), rest.className)}>
        <div className="flex gap-1.5 items-center">
          <CircleX className="size-4 text-red-500" />
          <p className="text-sm font-medium me-auto">{t.statusClientError}</p>
          <button
            type="button"
            className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
            onClick={() => reset()}
          >
            {t.close}
          </button>
        </div>
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
  const t = useTranslations();
  const statusInfo = useStatusInfo(data.status);
  const { parameters, type } = useMemo(
    () => safeParse(data.headers.get('Content-Type') ?? 'text/plain'),
    [data.headers],
  );
  let content: ReactNode;

  if (type.startsWith('image/')) {
    content = <ImageResult mime={type} buffer={data.body} />;
  } else if (data.body.byteLength > 0) {
    const lang = getTextFormat(type);

    if (lang) {
      content = <TextResult lang={lang} charset={parameters.charset} data={data} />;
    } else {
      content = (
        <p className="p-2 border rounded-lg bg-fd-card text-fd-card-foreground">
          {withReplacements(t.statusBinaryBody, { length: String(data.body.byteLength) })}
        </p>
      );
    }
  }

  return (
    <div {...rest} className={cn(panelVariants(), rest.className)}>
      <div className="flex items-center gap-1.5">
        <statusInfo.icon className={cn('size-4 shrink-0', statusInfo.color)} />
        <p className="text-sm font-medium text-nowrap">
          {data.status} {statusInfo.description}
        </p>

        <code className="ms-auto text-xs text-fd-muted-foreground truncate">{type}</code>
        <button
          type="button"
          className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
          onClick={() => reset()}
        >
          {t.close}
        </button>
      </div>
      {content}
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
    if (charset) {
      try {
        return new TextDecoder(charset).decode(data.body);
      } catch {
        /* invalid label — fall through */
      }
    }
    return new TextDecoder('utf-8').decode(data.body);
  }, [charset, data.body]);

  return <ClientCodeBlock lang={code.length > 5000 ? 'text' : lang} code={code} />;
}

function ImageResult({ mime, buffer }: { mime: string; buffer: ArrayBuffer }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mime, buffer]);

  if (!objectUrl) return;
  return <img src={objectUrl} alt="" className="w-full rounded-md border border-fd-border" />;
}
