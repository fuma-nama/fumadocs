'use client';
import { useRef, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Check, ChevronDown } from 'lucide-react';
import { StfProvider, useFieldValue, useListener, useStf } from '@fumari/stf';
import { useTranslations } from '@fuma-translate/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'shared-api/components/select';
import { useServer } from '@/utils/use-server';
import type { ServerVariableObject } from '@/types';
import { cn } from '@/utils/cn';

/** the base URL of requests, selects the server and edits its variables */
export default function ServerSelect({ className }: { className?: string }) {
  const { servers, server, resolveUrl, setServer, setServerVariables } = useServer();
  const [open, setOpen] = useState(false);
  const t = useTranslations({ note: 'playground server select' });
  const base = resolveUrl().replace(/\/$/, '');

  if (!servers || servers.length === 0)
    return (
      <span className={cn('truncate ps-1.5 text-fd-muted-foreground', className)}>{base}</span>
    );

  const serverSchema = server ? servers.find((item) => item.url === server.url) : undefined;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          'group flex min-w-0 shrink items-center gap-1 rounded-lg px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
          className,
        )}
      >
        <span className="truncate">{base}</span>
        <ChevronDown className="size-3 shrink-0 transition-transform duration-200 group-data-popup-open:rotate-180" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
          <Popover.Popup className="flex max-h-(--available-height) w-[min(26rem,calc(100vw-2rem))] origin-(--transform-origin) flex-col overflow-y-auto rounded-xl border bg-fd-popover p-1 text-sm text-fd-popover-foreground shadow-lg transition-[opacity,scale] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-fd-muted-foreground">
              {t('Server URL')}
            </p>
            {servers.map((item) => {
              const selected = item.url === server?.url;

              return (
                <button
                  key={item.url}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setServer(item.url!);
                    if (!item.variables) setOpen(false);
                  }}
                  className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:bg-fd-accent focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[0.8125rem] break-all">{item.url}</span>
                    {item.description && (
                      <span className="mt-0.5 block text-xs text-fd-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </span>
                  {selected && <Check className="mt-0.5 size-3.5 shrink-0 text-fd-primary" />}
                </button>
              );
            })}
            {server?.variables && serverSchema?.variables && (
              <ServerVariables
                key={server.url}
                defaultValues={server.variables}
                schema={serverSchema.variables}
                onChange={setServerVariables}
              />
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ServerVariables({
  defaultValues,
  onChange,
  schema,
}: {
  defaultValues: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  schema: Record<string, ServerVariableObject>;
}) {
  const t = useTranslations({ note: 'playground server select' });
  const stf = useStf({
    defaultValues: () => structuredClone(defaultValues),
  });
  const timerRef = useRef<number | null>(null);
  useListener({
    stf,
    onUpdate() {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);

      timerRef.current = window.setTimeout(
        () => onChange(stf.dataEngine.getData() as Record<string, string>),
        300,
      );
    },
  });

  return (
    <StfProvider value={stf}>
      <div className="mt-1 flex flex-col gap-2.5 border-t px-2.5 pt-2.5 pb-2">
        <p className="text-xs font-medium text-fd-muted-foreground">{t('Variables')}</p>
        {Object.entries(schema).map(([key, variable]) => (
          <div
            key={key}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3"
          >
            <label htmlFor={`server-${key}`} className="min-w-0">
              <span className="block truncate font-mono text-[0.8125rem]">{key}</span>
              {variable.description && (
                <span className="block text-xs text-fd-muted-foreground">
                  {variable.description}
                </span>
              )}
            </label>
            <VariableInput fieldName={key} variable={variable} />
          </div>
        ))}
      </div>
    </StfProvider>
  );
}

function VariableInput({
  fieldName,
  variable,
}: {
  variable: ServerVariableObject;
  fieldName: string;
}) {
  const t = useTranslations({ note: 'playground server select' });
  const id = `server-${fieldName}`;
  const [value, setValue] = useFieldValue([fieldName], {
    compute(currentValue) {
      return typeof currentValue === 'string' ? currentValue : undefined;
    },
  });

  if (variable.enum) {
    return (
      <Select value={value ?? null} onValueChange={(v) => v !== null && setValue(v)}>
        <SelectTrigger id={id} className="h-8 py-1 text-[0.8125rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {variable.enum.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <input
      id={id}
      value={value ?? ''}
      onChange={(e) => setValue(e.target.value)}
      placeholder={t('Enter Value')}
      className="h-8 w-full rounded-md border bg-fd-secondary px-2 font-mono text-[0.8125rem] text-fd-secondary-foreground outline-none placeholder:text-fd-muted-foreground focus-visible:ring-2 focus-visible:ring-fd-ring"
    />
  );
}
