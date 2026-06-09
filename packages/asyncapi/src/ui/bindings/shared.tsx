'use client';
import type { FC, ReactNode } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { useRenderContext } from '@/ui/contexts/api';
import { cn } from '@/utils/cn';
import { AsyncAPISchemaObject } from '@/types';
import { NoReference } from '@fumadocs/api-docs/schema';

export type BindingComponent = FC<{ binding: Record<string, unknown> }>;
export type BindingSummaryFn = (binding: Record<string, unknown>) => string | undefined;

export interface ProtocolBindingDefinition {
  label: string;
  Channel: BindingComponent;
  Operation: BindingComponent;
  Message: BindingComponent;
  getChannelSummary?: BindingSummaryFn;
  getOperationSummary?: BindingSummaryFn;
  getMessageSummary?: BindingSummaryFn;
}

export function formatBindingScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => formatBindingScalar(item)).join(', ');
  }

  return JSON.stringify(value);
}

export function hasBindingFields(
  binding: Record<string, unknown>,
  ignore: string[] = ['bindingVersion'],
): boolean {
  return Object.keys(binding).some(
    (key) => !ignore.includes(key) && !key.startsWith('x-') && binding[key] !== undefined,
  );
}

export function joinBindingSummary(
  ...parts: (string | undefined | null | false)[]
): string | undefined {
  const filtered = parts.filter((part): part is string => Boolean(part));
  return filtered.length > 0 ? filtered.join(' · ') : undefined;
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

export function BindingEmpty() {
  const t = useTranslations({ note: 'bindings' });

  return (
    <p className="text-xs text-fd-muted-foreground not-prose py-2">
      {t('No additional configuration for this binding.')}
    </p>
  );
}

export function BindingGroup({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-fd-secondary/40 divide-y divide-fd-border/40">
      <p className="px-3 py-2 text-xs font-medium text-fd-muted-foreground">{title}</p>
      <div className="px-3 pb-1">{children}</div>
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
        'grid grid-cols-1 gap-1 py-2 border-b border-fd-border/40 last:border-b-0 sm:grid-cols-[minmax(8rem,11rem)_1fr] sm:gap-4',
        className,
      )}
    >
      <dt className="text-xs font-medium text-fd-muted-foreground">{label}</dt>
      <dd className="text-sm min-w-0">{value}</dd>
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

export function BindingSchema({
  name,
  schema,
}: {
  name: string;
  schema: NoReference<AsyncAPISchemaObject>;
}) {
  const ctx = useRenderContext();

  return (
    <ctx.SchemaUI
      client={{
        name,
        required: false,
        as: 'body',
      }}
      root={schema as never}
    />
  );
}

function VersionOnlyBinding({ binding }: { binding: { bindingVersion?: string | number } }) {
  if (!binding.bindingVersion) return <BindingEmpty />;

  return (
    <BindingFields>
      <BindingFieldRow
        label="Binding Version"
        value={<code className="text-xs">{binding.bindingVersion}</code>}
      />
    </BindingFields>
  );
}

export function createBinding({
  label,
  Channel = VersionOnlyBinding,
  Operation = VersionOnlyBinding,
  Message = VersionOnlyBinding,
  getChannelSummary,
  getOperationSummary,
  getMessageSummary,
}: Partial<ProtocolBindingDefinition> & { label: string }): ProtocolBindingDefinition {
  return {
    label,
    Channel,
    Operation,
    Message,
    getChannelSummary,
    getOperationSummary,
    getMessageSummary,
  };
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
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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
  if (!hasBindingFields(binding)) return <BindingEmpty />;

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
