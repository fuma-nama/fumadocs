'use client';
import { useTranslations } from '@fuma-translate/react';
import { dereference, type JsonSchema } from '@fumadocs/json-schema';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  Accordions,
  AccordionTrigger,
} from 'shared-api/components/accordion';
import { useAnchorId } from 'shared-api/auto-anchor';
import type { MessageSchema, OperationMessage } from '@/operation';
import type { AsyncAPISchemaObject } from '@/types';
import { SchemaUI } from '@/ui/components/schema';
import { Markdown } from '@/ui/components/markdown';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { MessageBindings } from '@/ui/bindings';
import { MessageName } from '@/ui/components/message-name';
import { CopyTypeScript, useTypeScriptDefinitions } from '@/ui/components/typescript';
import { idToTitle } from 'shared-api/utils/id-to-title';
import { MessageExamples } from './examples';
import { ExternalDocs, SectionHeader } from './section';

/**
 * Messages of an operation as an accordion.
 */
export function MessagesSection({
  id,
  title,
  messages,
  headingLevel,
}: {
  /** anchor of section, the messages are under it */
  id: string;
  title: string;
  messages: OperationMessage[];
  headingLevel: number;
}) {
  return (
    <>
      <SectionHeader id={id} depth={headingLevel} title={title} />
      <MessageList id={id} messages={messages} headingLevel={headingLevel + 1} />
    </>
  );
}

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
  const { message, payload, headers, contentType } = item;
  const correlationId = dereference(message.correlationId);
  // like `PlanetCreated` for the types of its schemas
  const typeName = idToTitle(item.id).replace(/\W/g, '');

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
          {payload && (
            <MessageSchemaCard
              name="payload"
              typeName={`${typeName}Payload`}
              schema={payload}
              contentType={contentType}
              received={item.received}
            />
          )}
          {headers && (
            <MessageSchemaCard
              name="headers"
              typeName={`${typeName}Headers`}
              schema={headers}
              received={item.received}
            />
          )}
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
        <MessageExamples item={item} className="@4xl:w-[400px] @4xl:shrink-0" />
      </div>
    </div>
  );
}

function MessageSchemaCard({
  name,
  typeName,
  schema,
  contentType,
  received,
}: {
  name: string;
  typeName: string;
  schema: MessageSchema;
  contentType?: string;
  received: boolean;
}) {
  if (schema.schemaFormat !== undefined)
    return <RawSchemaCard name={name} schema={schema.schema} schemaFormat={schema.schemaFormat} />;

  return (
    <JsonSchemaCard
      name={name}
      typeName={typeName}
      schema={schema.schema}
      contentType={contentType}
      received={received}
    />
  );
}

/** properties readers don't see are hidden, like `readOnly` ones of messages they send */
function JsonSchemaCard({
  name,
  typeName,
  schema,
  contentType,
  received,
}: {
  name: string;
  typeName: string;
  schema: AsyncAPISchemaObject;
  contentType?: string;
  received: boolean;
}) {
  const ts = useTypeScriptDefinitions(schema as JsonSchema, {
    name: typeName,
    readOnly: received,
    writeOnly: !received,
  });

  return (
    <SchemaUI
      client={{
        name,
        as: 'body',
        selector: contentType && <span className="min-w-0 px-1.5 font-mono">{contentType}</span>,
        actions: ts && <CopyTypeScript code={ts} name={name} />,
      }}
      root={schema as never}
      readOnly={received}
      writeOnly={!received}
    />
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
