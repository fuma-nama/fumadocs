'use client';
import { use, useMemo } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { dereference, type JsonSchema } from '@fumadocs/json-schema';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from 'shared-api/components/accordion';
import { useAnchorId } from 'shared-api/auto-anchor';
import { idToTitle } from 'shared-api/utils/id-to-title';
import type { MessageSchema, OperationMessage } from '@/operation';
import type { AsyncAPISchemaObject } from '@/types';
import { useAsyncAPI, useRenderContext } from '@/utils/create-page';
import { cn } from '@/utils/cn';
import { SchemaUI } from '@/ui/components/schema';
import { Markdown } from '@/ui/components/markdown';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { MessageName } from '@/ui/components/message-name';
import { MessageBindings } from '@/ui/bindings';
import { MessageExamples, type Part } from './examples';
import { ExternalDocs } from './section';

/**
 * The messages, linked by `#{id}.{message id}`. A single message starts open.
 */
export function MessageList({
  id,
  messages,
  headingLevel,
}: {
  id: string;
  messages: OperationMessage[];
  headingLevel: number;
}) {
  return (
    <Accordions type="multiple" defaultValue={messages.length === 1 ? messages[0].id : undefined}>
      {messages.map((item) => (
        <AccordionItem key={item.id} value={item.id} anchorSegments={[id, item.id]}>
          <MessageHeader item={item} depth={headingLevel} />
          <AccordionContent>
            <MessageDetail item={item} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordions>
  );
}

/** the title of message with its name at the end, the summary below */
function MessageHeader({ item, depth }: { item: OperationMessage; depth: number }) {
  const Tag = `h${Math.min(depth, 6)}` as 'h3';
  const { message } = item;

  return (
    <AccordionHeader id={useAnchorId([])} render={<Tag />} className="scroll-m-28 text-sm">
      {/* the chevron is centered on the first line */}
      <AccordionTrigger className="min-w-0 items-start gap-2 py-3 [&>svg]:mt-[3px]">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <MessageName item={item} className="flex-1" />
            {message.title && message.name && (
              <code className="max-w-1/2 text-end text-xs font-normal wrap-anywhere text-fd-muted-foreground">
                {message.name}
              </code>
            )}
          </span>
          {message.summary && (
            <span className="font-normal text-fd-muted-foreground">{message.summary}</span>
          )}
        </span>
      </AccordionTrigger>
    </AccordionHeader>
  );
}

function MessageDetail({ item }: { item: OperationMessage }) {
  const t = useTranslations({ note: 'operation page' });
  const { message, payload, headers } = item;
  const correlationId = dereference(message.correlationId);

  return (
    // aligned with the name of message after the chevron
    <div className="flex flex-col gap-3 ps-5.5 pb-4 text-sm">
      {message.description && (
        <div className="prose-no-margin">
          <Markdown md={message.description} />
        </div>
      )}
      {/* wide pages put the example beside the schemas, their tops aligned */}
      <div className="flex flex-col gap-x-6 gap-y-3 @4xl:flex-row @4xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {payload && <MessageSchemaCard item={item} part="payload" schema={payload} />}
          {headers && <MessageSchemaCard item={item} part="headers" schema={headers} />}
          {correlationId && (
            <div className="not-prose flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.8125rem]">
              <span className="text-fd-muted-foreground">{t('Correlation ID')}</span>
              <code>{correlationId.location}</code>
              {correlationId.description && (
                <div className="basis-full text-fd-muted-foreground prose-no-margin">
                  <Markdown md={correlationId.description} />
                </div>
              )}
            </div>
          )}
          <MessageBindings bindings={message.bindings} />
          <ExternalDocs docs={message.externalDocs} />
        </div>
        <MessageExamples item={item} />
      </div>
    </div>
  );
}

function MessageSchemaCard({
  item,
  part,
  schema,
}: {
  item: OperationMessage;
  part: Part;
  schema: MessageSchema;
}) {
  if (schema.schemaFormat !== undefined)
    return <RawSchemaCard name={part} schema={schema.schema} schemaFormat={schema.schemaFormat} />;

  return <JsonSchemaCard item={item} part={part} schema={schema.schema} />;
}

/** properties readers don't see are hidden, like `readOnly` ones of messages they send */
function JsonSchemaCard({
  item,
  part,
  schema,
}: {
  item: OperationMessage;
  part: Part;
  schema: AsyncAPISchemaObject;
}) {
  const { generateTypeScriptDefinitions } = useRenderContext();
  const { doc } = useAsyncAPI();
  const { received, contentType } = item;
  // like `PlanetCreatedPayload`
  const typeName =
    idToTitle(item.id).replace(/\W/g, '') + (part === 'payload' ? 'Payload' : 'Headers');
  const result = useMemo(
    () =>
      generateTypeScriptDefinitions
        ? generateTypeScriptDefinitions(schema as JsonSchema, {
            name: typeName,
            readOnly: received,
            writeOnly: !received,
            document: doc.bundled,
          })
        : undefined,
    [generateTypeScriptDefinitions, schema, typeName, received, doc],
  );
  // generators returning promises are awaited on server components
  const ts = result instanceof Promise ? use(result) : result;

  return (
    <SchemaUI
      client={{
        name: part,
        as: 'body',
        selector: part === 'payload' && contentType && (
          <span className="min-w-0 px-1.5 font-mono">{contentType}</span>
        ),
        actions: ts && <CopyTypeScript code={ts} name={part} />,
      }}
      root={schema as never}
      readOnly={received}
      writeOnly={!received}
    />
  );
}

function CopyTypeScript({ code, name }: { code: string; name: string }) {
  const t = useTranslations({ note: 'TypeScript definitions' });
  const [isChecked, onCopy] = useCopyButton(() => navigator.clipboard.writeText(code));

  return (
    <button
      type="button"
      title={t('Use the {name} type in TypeScript.', { variables: { name } })}
      onClick={onCopy}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        '-my-1 shrink-0 gap-1.5 text-fd-muted-foreground [&_svg]:size-3.5',
      )}
    >
      {isChecked ? <Check /> : <Copy />}
      TypeScript
    </button>
  );
}

/** a schema in a format other than JSON Schema, like Avro or Protobuf, as it is */
function RawSchemaCard({
  name,
  schema,
  schemaFormat,
}: {
  name: string;
  schema: unknown;
  schemaFormat: string;
}) {
  // documents are parsed, only schemas written as strings like Protobuf aren't objects
  const [lang, code] =
    typeof schema === 'string'
      ? [schemaFormat.includes('protobuf') ? 'proto' : 'text', schema]
      : ['json', JSON.stringify(schema, null, 2)];

  return (
    <div className="not-prose overflow-hidden rounded-xl border bg-fd-card">
      <div className="flex h-9 items-center gap-2 border-b ps-3 pe-2 text-[0.8125rem]">
        <span className="font-mono font-medium">{name}</span>
        <code className="ms-auto truncate text-xs text-fd-muted-foreground">{schemaFormat}</code>
      </div>
      <ClientCodeBlock
        lang={lang}
        code={code}
        codeblock={{ className: 'my-0 rounded-none border-0 bg-transparent shadow-none' }}
      />
    </div>
  );
}
