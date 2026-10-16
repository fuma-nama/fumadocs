'use client';
import { useTranslations } from '@fuma-translate/react';
import { dereference } from '@fumadocs/json-schema';
import {
  type ServerOption,
  ServerPopover,
  type ServerVariable,
  ServerVariables,
} from 'shared-api/components/playground/server-select';
import { idToTitle } from 'shared-api/utils/id-to-title';
import { useServer } from '@/utils/use-server';
import { cn } from '@/utils/cn';

/** the server of a connection, selects one of the servers and edits its variables */
export function ServerSelect({ label, className }: { label: string; className?: string }) {
  const { servers, server, resolveUrl, setServer, setServerVariables } = useServer();
  const t = useTranslations({ note: 'asyncapi server select' });
  const ids = Object.keys(servers);
  const variables = server ? servers[server.id]?.variables : undefined;

  if (ids.length <= 1 && !variables)
    return (
      <span className={cn('truncate px-1.5 text-fd-muted-foreground', className)}>{label}</span>
    );

  const options: ServerOption[] = [];
  for (const id of ids) {
    const item = servers[id];
    const summary = item.summary ?? item.description;

    options.push({
      value: id,
      hasVariables: item.variables !== undefined,
      label: (
        <>
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[0.8125rem] font-medium">
              {item.title ?? idToTitle(id)}
            </span>
            <span className="font-mono text-xs text-fd-muted-foreground">
              {item.protocol}
              {item.protocolVersion && ` ${item.protocolVersion}`}
            </span>
          </span>
          <span className="mt-0.5 block font-mono text-xs break-all text-fd-muted-foreground">
            {resolveUrl(id)}
          </span>
          {summary && (
            <span className="mt-1 line-clamp-2 block text-xs text-fd-muted-foreground">
              {summary}
            </span>
          )}
        </>
      ),
    });
  }

  let resolved: Record<string, ServerVariable> | undefined;
  if (variables) {
    resolved = {};
    for (const [key, item] of Object.entries(variables)) resolved[key] = dereference(item);
  }

  return (
    <ServerPopover
      label={label}
      title={t('Server')}
      value={server?.id}
      onValueChange={setServer}
      options={options}
      className={className}
    >
      {server && resolved && (
        <ServerVariables
          key={server.id}
          defaultValues={server.variables}
          variables={resolved}
          onChange={setServerVariables}
        />
      )}
    </ServerPopover>
  );
}
