'use client';
import { useMemo, useState } from 'react';
import { Info, KeyRound, Route, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from '@fuma-translate/react';
import { dereference, type JsonSchema } from '@fumadocs/json-schema';
import { useDataEngine } from '@fumari/stf';
import {
  type FieldEntry,
  FieldRow,
  getRemoval,
  type NavigateFn,
} from 'shared-api/components/playground/fields';
import {
  FieldPanel,
  OverviewLayer,
  Section,
  useFieldStack,
} from 'shared-api/components/playground/panels';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import type { Playground } from '@/playground';
import { type OperationParameter, type SecurityRequirement, useOperation } from '@/operation';
import type { SecuritySchemeObject, WsChannelBinding } from '@/types';
import { useBindings } from '@/ui/bindings';
import { useSecurityGroups } from '@/ui/operation/auth';
import { cn } from '@/utils/cn';

export interface ConnectionInputs {
  /** lists of alternative schemes, one of each list is required */
  auth: SecurityRequirement[][];
  parameters: OperationParameter[];
  /** the query from the WebSocket binding of channel */
  query: { entry: FieldEntry; required: boolean }[];
}

/** what readers enter before connecting */
export function useConnectionInputs(): ConnectionInputs {
  const { parameters, channel } = useOperation();
  const auth = useSecurityGroups();
  const binding = useBindings(channel.bindings).get('ws') as WsChannelBinding | undefined;
  const query = useMemo(() => {
    const out: ConnectionInputs['query'] = [];
    const schema = dereference(binding?.query);
    if (typeof schema !== 'object' || !schema?.properties) return out;

    for (const [name, property] of Object.entries(schema.properties)) {
      const required = schema.required?.includes(name) ?? false;
      out.push({
        entry: {
          fieldName: ['query', name],
          name,
          schema: property as JsonSchema,
          removal: getRemoval(required, false),
        },
        required,
      });
    }

    return out;
  }, [binding]);

  return { auth, parameters, query };
}

/** browsers can't set the headers of WebSocket connections, only API keys in the query work */
function isQueryKey(
  scheme: SecuritySchemeObject,
): scheme is SecuritySchemeObject & { name: string } {
  return scheme.type === 'httpApiKey' && scheme.in === 'query' && Boolean(scheme.name);
}

/** the inputs of connection, nested fields open in panels, locked while connected */
export function ConnectionPanel({
  playground,
  inputs,
  className,
}: {
  playground: Playground;
  inputs: ConnectionInputs;
  className?: string;
}) {
  const t = useTranslations({ note: 'playground' });
  const tPage = useTranslations({ note: 'operation page' });
  const fields = useFieldStack();
  const disabled = playground.status !== 'closed';
  const { auth, parameters, query } = inputs;
  const sectionNames: Record<string, string> = {
    parameters: t('Parameters'),
    query: t('Query'),
  };
  const parameterEntries: FieldEntry[] = [];
  for (const { name, schema } of parameters)
    parameterEntries.push({ fieldName: ['parameters', name], name, schema });
  const queryEntries: FieldEntry[] = [];
  for (const item of query) queryEntries.push(item.entry);
  const onNavigate = fields.openNested([]);

  return (
    <div className={cn('@container grid min-h-0', className)}>
      <OverviewLayer covered={fields.stack.length > 0}>
        <fieldset disabled={disabled} className="contents">
          {auth.map((items, i) => (
            <AuthSection
              key={i}
              title={
                auth.length > 1
                  ? i === 0
                    ? tPage('To connect to the server')
                    : tPage('To perform the operation')
                  : t('Authorization')
              }
              items={items}
              onNavigate={onNavigate}
            />
          ))}
          {parameterEntries.length > 0 && (
            <Section icon={Route} title={t('Parameters')} count={parameterEntries.length}>
              {parameterEntries.map((entry) => (
                <FieldRow
                  key={entry.name}
                  entry={entry}
                  required
                  onNavigate={() => onNavigate(entry, parameterEntries)}
                />
              ))}
            </Section>
          )}
          {queryEntries.length > 0 && (
            <Section icon={SlidersHorizontal} title={t('Query')} count={queryEntries.length}>
              {query.map(({ entry, required }) => (
                <FieldRow
                  key={entry.name}
                  entry={entry}
                  required={required}
                  onNavigate={() => onNavigate(entry, queryEntries)}
                />
              ))}
            </Section>
          )}
        </fieldset>
      </OverviewLayer>
      {fields.stack.length > 0 && (
        <FieldPanel
          fields={fields}
          root={sectionNames[fields.stack[0].fieldName[0]]}
          disabled={disabled}
        />
      )}
    </div>
  );
}

const stringSchema: JsonSchema = { type: 'string' };

/** one of the alternative schemes, readers pick the one to enter */
function AuthSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: SecurityRequirement[];
  onNavigate: NavigateFn;
}) {
  const t = useTranslations({ note: 'playground' });
  const engine = useDataEngine();
  const [selected, setSelected] = useState(() =>
    Math.max(
      0,
      items.findIndex((item) => isQueryKey(item.scheme)),
    ),
  );
  const { id, scheme } = items[selected];
  const options = items.map((item, i) => ({ value: String(i), label: item.id }));
  let content;

  if (isQueryKey(scheme)) {
    const entry: FieldEntry = {
      fieldName: ['query', scheme.name],
      name: scheme.name,
      schema: stringSchema,
    };
    content = (
      <FieldRow
        entry={entry}
        required
        description={scheme.description}
        onNavigate={() => onNavigate(entry, [entry])}
      />
    );
  } else {
    content = (
      <div className="flex gap-2 border-b px-4 py-2.5 text-xs text-fd-muted-foreground last:border-b-0">
        <Info className="mt-px size-3.5 shrink-0" />
        <p className="min-w-0 flex-1">
          {t.jsx("Browsers can't send {scheme} with WebSocket connections.", {
            variables: { scheme: <code>{id}</code> },
          })}
        </p>
      </div>
    );
  }

  return (
    <Section
      icon={KeyRound}
      title={title}
      actions={
        options.length > 1 ? (
          <Select
            items={options}
            value={String(selected)}
            onValueChange={(v) => {
              if (v === null) return;
              // the key of the previous scheme isn't sent anymore
              if (isQueryKey(scheme)) engine.delete(['query', scheme.name]);
              setSelected(Number(v));
            }}
          >
            <SelectTrigger
              aria-label={title}
              className="h-7 w-auto max-w-60 gap-1.5 border-0 bg-transparent px-2 font-mono text-xs hover:bg-fd-accent focus:ring-0 focus-visible:ring-2 @sm:-me-2"
            >
              <SelectValue className="truncate" />
            </SelectTrigger>
            <SelectContent align="end">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} className="font-mono text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <code className="truncate text-xs text-fd-muted-foreground">{options[0].label}</code>
        )
      }
    >
      {content}
    </Section>
  );
}
