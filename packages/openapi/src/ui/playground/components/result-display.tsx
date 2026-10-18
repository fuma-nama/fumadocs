'use client';
import { type ComponentProps, type ReactNode, useCallback, useMemo } from 'react';
import { DownloadIcon, FileIcon } from 'lucide-react';
import type { FetchResponseResult, FetchResult } from '@/playground/fetcher';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { useTranslations } from '@fuma-translate/react';
import type { BuiltinLanguage, SpecialLanguage } from 'shiki';
import { iconButtonClassName, panelCodeBlock } from 'shared-api/components/playground/panels';
import { RequestError, ResponseView } from 'shared-api/components/playground/result';

export interface ResultDisplayProps extends ComponentProps<'div'> {
  data: FetchResult;
  reset: () => void;
}

export function DefaultResultDisplay({ data, reset, ...rest }: ResultDisplayProps) {
  if (data.type === 'client_error')
    return <RequestError {...rest} message={data.message} url={data.url} onClear={reset} />;

  return <ResponseResult {...rest} data={data} reset={reset} />;
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
  const type = data.mediaType ?? 'text/plain';
  const size = data.body.byteLength;
  const lang = getTextFormat(type);
  // link elements to the body, its object URL is revoked with them
  const bodyUrlRef = useCallback(
    (element: HTMLImageElement | HTMLAnchorElement | null) => {
      if (!element) return;
      const url = URL.createObjectURL(new Blob([data.body], { type }));
      if (element instanceof HTMLAnchorElement) element.href = url;
      else element.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [data.body, type],
  );

  let body: ReactNode;
  if (type.startsWith('image/')) {
    body = (
      <div className="flex min-h-full items-center justify-center p-4">
        <img ref={bodyUrlRef} alt="" className="max-w-full rounded-lg border" />
      </div>
    );
  } else if (lang) {
    body = <TextResult lang={lang} data={data} />;
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

  return (
    <ResponseView
      {...rest}
      status={data.status}
      duration={data.duration}
      size={size}
      url={data.url}
      headers={Array.from(data.headers)}
      onClear={reset}
      actions={
        size > 0 && (
          <a
            ref={bodyUrlRef}
            download={data.fileName ?? 'response'}
            aria-label={t('Download')}
            title={t('Download')}
            className={iconButtonClassName}
          >
            <DownloadIcon />
          </a>
        )
      }
    >
      {body}
    </ResponseView>
  );
}

function TextResult({
  lang,
  data,
}: {
  lang: BuiltinLanguage | SpecialLanguage;
  data: FetchResponseResult;
}) {
  const code = useMemo(() => {
    const text = data.text();
    if (lang !== 'json') return text;
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }, [lang, data]);

  return (
    <ClientCodeBlock
      lang={code.length > 5000 ? 'text' : lang}
      code={code}
      codeblock={panelCodeBlock}
    />
  );
}
