'use client';
import type { FC, ReactNode } from 'react';
import { SchemaUI } from '@/ui/components/schema';
import { ClientCodeBlock } from '@/ui/components/codeblock';
import { cn } from '@/utils/cn';
import type { AsyncAPISchemaObject } from '@/types';

export type BindingComponent = FC<{ binding: Record<string, unknown> }>;

export interface ProtocolBindingDefinition {
  label: string;
  Server: BindingComponent;
  Channel: BindingComponent;
  Operation: BindingComponent;
  Message: BindingComponent;
}

function formatBindingScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => formatBindingScalar(item)).join(', ');
  }

  return JSON.stringify(value);
}

export function BindingFields({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn('not-prose', className)}>{children}</dl>;
}

export function BindingGroup({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-fd-secondary/50">
      {title && (
        <p className="border-b border-fd-border/60 px-3 py-2 text-xs text-fd-muted-foreground">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export function BindingFieldRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-1 border-t border-fd-border/60 px-3 py-2.5 first:border-t-0 @sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] @sm:gap-4',
        className,
      )}
    >
      <dt className="text-[0.8125rem] text-fd-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-[0.8125rem]">{value}</dd>
    </div>
  );
}

export function BindingScalarValue({ value }: { value: unknown }) {
  const formatted = formatBindingScalar(value);

  if (typeof value === 'string' || typeof value === 'number') {
    return <code className="text-xs break-all">{formatted}</code>;
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium',
          value
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            : 'border-fd-border bg-fd-muted text-fd-muted-foreground',
        )}
      >
        {formatted}
      </span>
    );
  }

  return <span className="text-sm">{formatted}</span>;
}

export function BindingTagList({ value }: { value: Record<string, string> }) {
  const entries = Object.entries(value);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, entryValue]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-md border bg-fd-secondary px-2 py-0.5 text-xs"
        >
          <span className="text-fd-muted-foreground">{key}</span>
          <code>{entryValue}</code>
        </span>
      ))}
    </div>
  );
}

export function BindingSchema({ name, schema }: { name: string; schema: AsyncAPISchemaObject }) {
  return (
    <SchemaUI
      client={{
        name,
        required: false,
        as: 'body',
      }}
      root={schema as never}
    />
  );
}

/** a value with nested structure, like an access policy */
export function BindingJson({ value }: { value: unknown }) {
  return (
    <ClientCodeBlock
      lang="json"
      code={JSON.stringify(value, null, 2)}
      codeblock={{ className: 'my-0' }}
    />
  );
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

export function DestinationChannelBinding({
  binding,
}: {
  binding: {
    destination?: string;
    destinationType?: string;
    bindingVersion?: string | number;
  };
}) {
  return (
    <BindingFields>
      {binding.destination && (
        <BindingFieldRow
          label="Destination"
          value={<code className="text-xs">{binding.destination}</code>}
        />
      )}
      {binding.destinationType && (
        <BindingFieldRow
          label="Destination Type"
          value={<code className="text-xs">{binding.destinationType}</code>}
        />
      )}
    </BindingFields>
  );
}

export function HeadersMessageBinding({
  binding,
}: {
  binding: {
    headers?: unknown;
    bindingVersion?: string | number;
  };
}) {
  return (
    <BindingFields>
      {binding.headers != null && (
        <BindingFieldRow
          label="Headers"
          value={<BindingSchema name="headers" schema={binding.headers} />}
        />
      )}
    </BindingFields>
  );
}
