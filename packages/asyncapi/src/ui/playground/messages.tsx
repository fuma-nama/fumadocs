'use client';
import { memo, type ReactNode, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Radio, SendHorizontal, Trash2 } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { type JsonSchema, matches } from '@fumadocs/json-schema';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { cardCodeBlock, ExampleCopy, ExampleHeader } from 'shared-api/components/example';
import {
  iconButtonClassName,
  PanelHeader,
  Placeholder,
  SendShortcut,
} from 'shared-api/components/playground/panels';
import { DataEntry, LogList, LogTime, StatusEntry } from 'shared-api/components/playground/log';
import type { LogEntry, Playground } from '@/playground';
import { type OperationMessage, useChannelMessages } from '@/operation';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { MessageName } from '@/ui/components/message-name';
import { cn } from '@/utils/cn';

/** the URL to connect, then the messages of session with the latest above the composer */
export function MessagesPanel({
  playground,
  className,
}: {
  playground: Playground;
  className?: string;
}) {
  const t = useTranslations({ note: 'playground' });
  const { url, log, status } = playground;

  return (
    <section className={cn('flex min-h-0 flex-col', className)}>
      {url && (
        <div className="shrink-0 border-b">
          <ExampleHeader title={t('Connection URL')}>
            <ExampleCopy text={url} />
          </ExampleHeader>
          <ClientCodeBlock lang="text" code={url} codeblock={cardCodeBlock} />
        </div>
      )}
      <PanelHeader>
        <h3 className="me-auto text-[0.8125rem] font-medium">{t('Messages')}</h3>
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
      <div className="flex min-h-0 flex-1 flex-col">
        {log.length > 0 ? (
          <LogList label={t('Messages')} entries={log}>
            {(entry) => <Entry key={entry.id} entry={entry} />}
          </LogList>
        ) : (
          <Placeholder icon={Radio} className="min-h-40">
            {status === 'open' ? t('Waiting for messages.') : t('Connect to see messages.')}
          </Placeholder>
        )}
        <Composer open={status === 'open'} send={playground.send} />
      </div>
    </section>
  );
}

// entries don't change once added, a busy channel re-renders only the new one
const Entry = memo(function Entry({ entry }: { entry: LogEntry }) {
  const t = useTranslations({ note: 'playground' });

  if (entry.type === 'received' || entry.type === 'sent') return <MessageEntry entry={entry} />;

  let text: ReactNode;
  let detail: string | undefined;
  if (entry.type === 'opened') {
    text = t('Connected');
    detail = entry.data;
  } else if (entry.type === 'closed') {
    text = t('Disconnected');
    detail = `${entry.code ?? ''} ${entry.data ?? ''}`.trim();
  } else {
    text = t('Connection error');
    // browsers hide why connections fail
    detail =
      entry.data ?? t('Check the URL, and whether the server accepts connections from this site.');
  }

  return (
    <StatusEntry label={text} detail={detail} time={entry.time} error={entry.type === 'error'} />
  );
});

function MessageEntry({ entry }: { entry: LogEntry }) {
  const t = useTranslations({ note: 'playground' });
  const received = entry.type === 'received';
  const Icon = received ? ArrowDownLeft : ArrowUpRight;

  return (
    <DataEntry
      received={received}
      disabled={entry.data === undefined}
      summary={
        <>
          <Icon
            role="img"
            aria-label={received ? t('Received') : t('Sent')}
            className={cn(
              'size-3.5 shrink-0',
              received ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400',
            )}
          />
          {entry.message && <MessageName item={entry.message} className="shrink-0 font-medium" />}
          <span className="min-w-0 flex-1 truncate font-mono text-fd-muted-foreground">
            {entry.binary ? toHex(entry.binary) : entry.data}
          </span>
          {entry.binary && (
            <span className="shrink-0 text-fd-muted-foreground">
              {t('{length} bytes', { variables: { length: String(entry.binary.byteLength) } })}
            </span>
          )}
          <span className="text-fd-muted-foreground">
            <LogTime time={entry.time} />
          </span>
        </>
      }
      details={() => {
        if (entry.data === undefined) return;
        let code: [lang: string, code: string];
        try {
          code = ['json', JSON.stringify(JSON.parse(entry.data), null, 2)];
        } catch {
          code = ['text', entry.data];
        }

        return (
          <div className="px-3 pb-3">
            <ClientCodeBlock lang={code[0]} code={code[1]} codeblock={{ className: 'my-0' }} />
          </div>
        );
      }}
    />
  );
}

function getExampleText(message: OperationMessage | undefined): string {
  const payload = message?.examples[0]?.payload;
  if (payload === undefined) return '';
  return typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
}

const customMessage = '';

type Encoding = 'text' | 'hex' | 'base64';

/** the bytes of hex or Base64 text, `undefined` when it isn't valid */
export function parseBinary(text: string, encoding: 'hex' | 'base64'): ArrayBuffer | undefined {
  try {
    if (encoding === 'base64') return Uint8Array.from(atob(text), (c) => c.charCodeAt(0)).buffer;
    const hex = text.replace(/\s+/g, '');
    if (/^(?:[\da-f]{2})*$/i.test(hex))
      return Uint8Array.from(hex.match(/../g) ?? [], (byte) => parseInt(byte, 16)).buffer;
  } catch {}
}

const previewBytes = 64;

/** the hex of the first bytes, like `48 65 6c 6c 6f` */
export function toHex(data: ArrayBuffer): string {
  let out = '';
  for (const byte of new Uint8Array(data, 0, Math.min(data.byteLength, previewBytes)))
    out += `${byte.toString(16).padStart(2, '0')} `;
  return data.byteLength > previewBytes ? `${out}…` : out.trimEnd();
}

/** compose a message to send, starting from the example of a documented message */
const Composer = memo(function Composer({
  open,
  send,
}: {
  open: boolean;
  send: Playground['send'];
}) {
  const t = useTranslations({ note: 'playground' });
  const { outgoing } = useChannelMessages();
  const [selected, setSelected] = useState(outgoing[0]?.id ?? customMessage);
  const message = outgoing.find((item) => item.id === selected);
  const [text, setText] = useState(() => getExampleText(message));
  const [encoding, setEncoding] = useState<Encoding>('text');
  const payload = message?.payload;
  let check: { ok: boolean; text: string; data?: ArrayBuffer } | undefined;
  if (text && encoding !== 'text') {
    const data = parseBinary(text, encoding);
    check = data
      ? {
          ok: true,
          data,
          text: t('{length} bytes', { variables: { length: String(data.byteLength) } }),
        }
      : { ok: false, text: encoding === 'hex' ? t('Invalid hex') : t('Invalid Base64') };
  } else if (text && payload && payload.schemaFormat === undefined) {
    try {
      check = matches(payload.schema as JsonSchema, JSON.parse(text))
        ? { ok: true, text: t('Matches the schema') }
        : { ok: false, text: t("Doesn't match the schema") };
    } catch {
      check = { ok: false, text: t('Invalid JSON') };
    }
  }
  const data = encoding === 'text' ? text : check?.data;

  function onSend() {
    // only text messages matching their schemas are labelled in the log
    if (send && data) send(data, encoding === 'text' && check?.ok ? message : undefined);
  }

  const items: { value: string; label: ReactNode }[] = [
    { value: customMessage, label: t('Custom') },
  ];
  for (const item of outgoing) items.push({ value: item.id, label: <MessageName item={item} /> });
  const encodings: { value: Encoding; label: string }[] = [
    { value: 'text', label: t('Text') },
    { value: 'hex', label: t('Hex') },
    { value: 'base64', label: 'Base64' },
  ];

  return (
    <div className="shrink-0 border-t">
      {outgoing.length > 0 && (
        <div className="flex h-10 items-center border-b px-1.5">
          <Select
            items={items}
            value={selected}
            onValueChange={(v) => {
              if (v === null) return;
              setSelected(v);
              setText(getExampleText(outgoing.find((item) => item.id === v)));
              setEncoding('text');
            }}
          >
            <SelectTrigger
              aria-label={t('Message type')}
              className="h-7 w-auto max-w-full min-w-0 gap-1.5 border-0 bg-transparent px-2.5 text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent"
            >
              <span className="shrink-0 text-fd-muted-foreground">{t('Message type')}</span>
              <SelectValue className="truncate font-medium" />
            </SelectTrigger>
            <SelectContent align="start" className="max-h-(--available-height) overflow-y-auto">
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value} className="text-xs">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <textarea
        aria-label={t('Message')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSend();
          }
        }}
        spellCheck={false}
        placeholder={t('Write a message to send')}
        className="block max-h-60 min-h-24 w-full resize-none bg-transparent px-4 pt-3 pb-1 font-mono text-[0.8125rem] leading-relaxed outline-none field-sizing-content placeholder:text-fd-muted-foreground"
      />
      <div className="flex items-center gap-2 p-2 ps-4">
        <p
          className={cn(
            'min-w-0 flex-1 truncate text-xs',
            !send || !check
              ? 'text-fd-muted-foreground'
              : check.ok
                ? 'text-green-600 dark:text-green-400'
                : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {!open
            ? t('Connect to send messages.')
            : send
              ? check?.text
              : t('This connection only receives messages.')}
        </p>
        <Select
          items={encodings}
          value={encoding}
          onValueChange={(v) => {
            if (v !== null) setEncoding(v);
          }}
        >
          <SelectTrigger
            aria-label={t('Encoding')}
            className="h-7 w-auto shrink-0 gap-1.5 border-0 bg-transparent px-2.5 text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 data-popup-open:bg-fd-accent"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {encodings.map((item) => (
              <SelectItem key={item.value} value={item.value} className="text-xs">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          disabled={!send || !data}
          onClick={onSend}
          className={cn(
            buttonVariants({ variant: 'primary', size: 'sm' }),
            'shrink-0 gap-1.5 rounded-lg transition-[background-color,scale] active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none',
          )}
        >
          <SendHorizontal className="size-3.5" />
          {t('Send')}
          <SendShortcut />
        </button>
      </div>
    </div>
  );
});
