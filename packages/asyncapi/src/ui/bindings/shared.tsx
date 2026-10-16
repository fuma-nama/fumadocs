'use client';
import type { FC, ReactNode } from 'react';
import { SchemaUI } from '@/ui/components/schema';
import { ClientCodeBlock } from '@/ui/components/codeblock';

export type BindingComponent = FC<{ binding: Record<string, unknown> }>;

export interface ProtocolBindingDefinition {
  label: string;
  Server: BindingComponent;
  Channel: BindingComponent;
  Operation: BindingComponent;
  Message: BindingComponent;
}

const Empty: BindingComponent = () => null;

/** a protocol, the bindings without fields for readers render nothing */
export function createBinding({
  label,
  Server = Empty,
  Channel = Empty,
  Operation = Empty,
  Message = Empty,
}: Partial<ProtocolBindingDefinition> & { label: string }): ProtocolBindingDefinition {
  return { label, Server, Channel, Operation, Message };
}

export function Fields({ children }: { children: ReactNode }) {
  return <dl className="not-prose">{children}</dl>;
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-t border-fd-border/60 px-3 py-2.5 first:border-t-0 @sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] @sm:gap-4">
      <dt className="text-[0.8125rem] text-fd-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-[0.8125rem]">{value}</dd>
    </div>
  );
}

/** a row of text as code, hidden when empty */
export function CodeRow({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null;
  return <Row label={label} value={<code className="text-xs">{value}</code>} />;
}

function formatValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  return JSON.stringify(value);
}

/** a row of a value like a number or a list, hidden when it has nothing to show */
export function ValueRow({ label, value }: { label: string; value: unknown }) {
  const text = formatValue(value);
  if (!text) return null;
  let node: ReactNode;

  if (typeof value === 'string' || typeof value === 'number') {
    node = <code className="text-xs break-all">{text}</code>;
  } else if (typeof value === 'boolean') {
    node = (
      <span
        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${
          value
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'border-fd-border bg-fd-muted text-fd-muted-foreground'
        }`}
      >
        {text}
      </span>
    );
  } else {
    node = <span className="text-sm">{text}</span>;
  }

  return <Row label={label} value={node} />;
}

/** a row of a schema, or of the value in its place like a number of seconds */
export function SchemaRow({ label, name, value }: { label: string; name: string; value: unknown }) {
  // JSON Schemas are objects or booleans
  const schema = typeof value === 'boolean' || (typeof value === 'object' && value !== null);
  if (!schema) return <ValueRow label={label} value={value} />;

  return (
    <Row label={label} value={<SchemaUI client={{ name, as: 'body' }} root={value as never} />} />
  );
}

/** a value with nested structure, like an access policy */
export function JsonValue({ value }: { value: unknown }) {
  return (
    <ClientCodeBlock
      lang="json"
      code={JSON.stringify(value, null, 2)}
      codeblock={{ className: 'my-0' }}
    />
  );
}

export function JsonRow({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return <Row label={label} value={<JsonValue value={value} />} />;
}

export function TagsRow({ label, value }: { label: string; value?: Record<string, string> }) {
  const entries = Object.entries(value ?? {});
  if (entries.length === 0) return null;

  return (
    <Row
      label={label}
      value={
        <div className="flex flex-wrap gap-1.5">
          {entries.map(([key, item]) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-md border bg-fd-secondary px-2 py-0.5 text-xs"
            >
              <span className="text-fd-muted-foreground">{key}</span>
              <code>{item}</code>
            </span>
          ))}
        </div>
      }
    />
  );
}

/** a row of nested fields, like the exchange of a channel */
export function GroupRow({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Row
      label={label}
      value={
        <div className="overflow-hidden rounded-lg border bg-fd-secondary/50">
          {title && (
            <p className="border-b border-fd-border/60 px-3 py-2 text-xs text-fd-muted-foreground">
              {title}
            </p>
          )}
          <Fields>{children}</Fields>
        </div>
      }
    />
  );
}

export function DestinationChannelBinding({
  binding,
}: {
  binding: { destination?: string; destinationType?: string };
}) {
  return (
    <Fields>
      <CodeRow label="Destination" value={binding.destination} />
      <CodeRow label="Destination Type" value={binding.destinationType} />
    </Fields>
  );
}

export function HeadersMessageBinding({ binding }: { binding: { headers?: unknown } }) {
  return (
    <Fields>
      <SchemaRow label="Headers" name="headers" value={binding.headers} />
    </Fields>
  );
}
