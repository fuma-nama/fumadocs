'use client';
import { cn } from '@/utils/cn';
import { PlugIcon } from 'lucide-react';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
  Accordions,
} from '@fumadocs/api-docs/components/accordion';
import { getBindingEntries, getProtocolBinding, type BindingEntry } from './protocols';
import { ComponentProps, useMemo } from 'react';
import { useTranslations } from '@fuma-translate/react';
import { BindingFieldRow } from './shared';
import { ClientCodeBlock } from '../components/codeblock';

interface SharedProps {
  variant: 'sm' | 'default';
  level: 'operation' | 'message' | 'channel' | 'server';
}

function AccordionBindingItem({ entry, variant, level }: SharedProps & { entry: BindingEntry }) {
  const definition = getProtocolBinding(entry.protocol);
  const { Content, summary } = useMemo(() => {
    if (level === 'server') {
      return {
        summary: definition.getServerSummary?.(entry.binding),
        Content: definition.Server,
      };
    }
    if (level === 'channel') {
      return {
        summary: definition.getChannelSummary?.(entry.binding),
        Content: definition.Channel,
      };
    }
    if (level === 'message') {
      return {
        summary: definition.getMessageSummary?.(entry.binding),
        Content: definition.Message,
      };
    }
    return {
      summary: definition.getOperationSummary?.(entry.binding),
      Content: definition.Operation,
    };
  }, [entry, definition, level]);
  const version = entry.binding.bindingVersion;

  return (
    <AccordionItem value={entry.protocol}>
      <AccordionHeader>
        <AccordionTrigger
          className={cn(
            'inline-flex w-full items-center gap-2 font-medium',
            variant === 'sm' && 'p-2 text-xs bg-fd-secondary text-fd-secondary-foreground',
            variant === 'default' && 'px-4 py-3',
          )}
        >
          <PlugIcon
            className={cn(
              'size-4 shrink-0 text-fd-muted-foreground',
              variant === 'sm' && 'size-3.5',
            )}
          />
          <span>{definition.label}</span>
          {typeof version === 'string' && (
            <span className="rounded-md border bg-fd-muted px-1.5 py-0.5 text-[10px] font-medium text-fd-muted-foreground">
              v{version}
            </span>
          )}
          {summary && (
            <span className="truncate text-xs font-normal text-fd-muted-foreground">{summary}</span>
          )}
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent
        className={cn('border-t', variant === 'sm' && 'px-2', variant === 'default' && 'px-4')}
      >
        <Content binding={entry.binding} />
      </AccordionContent>
    </AccordionItem>
  );
}

export function AccordionBindings({
  bindings,
  level,
  variant,
  accordionsProps,
}: SharedProps & {
  bindings: Record<string, unknown>;
  accordionsProps?: Partial<ComponentProps<typeof Accordions>>;
}) {
  const t = useTranslations({ note: 'bindings' });
  const { protocols, extensions } = getBindingEntries(bindings);
  if (protocols.length === 0 && extensions.length === 0) return null;

  return (
    <Accordions
      type="multiple"
      {...accordionsProps}
      className={cn(
        'border overflow-hidden not-prose',
        variant === 'sm' && 'rounded-lg',
        variant === 'default' && 'bg-fd-card rounded-xl shadow-md',
        accordionsProps?.className,
      )}
    >
      {protocols.map((entry) => (
        <AccordionBindingItem key={entry.protocol} entry={entry} level={level} variant={variant} />
      ))}
      {extensions.map((entry) => (
        <AccordionItem key={entry.protocol} value={entry.protocol}>
          <AccordionHeader>
            <AccordionTrigger className="text-xs font-mono">{entry.protocol}</AccordionTrigger>
          </AccordionHeader>
          <AccordionContent>
            <ExtensionContent {...entry} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordions>
  );
}

function ExtensionContent({ binding, protocol }: BindingEntry) {
  const code = useMemo(() => {
    return JSON.stringify(binding, null, 2);
  }, [binding]);

  return (
    <BindingFieldRow
      label={<code className="text-xs">{protocol}</code>}
      value={<ClientCodeBlock lang="json" code={code} />}
    />
  );
}
