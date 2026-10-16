'use client';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Check, ChevronDown } from 'lucide-react';
import { StfProvider, useFieldValue, useListener, useStf } from '@fumari/stf';
import { useTranslations } from '@fuma-translate/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { cn } from '@/utils/cn';

export interface ServerOption {
  value: string;
  label: ReactNode;
  /** keep the popover open after selecting it, to edit its variables */
  hasVariables?: boolean;
}

/**
 * Selects the server in a popover, `children` goes below its options, like `<ServerVariables />`.
 */
export function ServerPopover({
  label,
  title,
  options,
  value,
  onValueChange,
  className,
  children,
}: {
  /** the trigger, like the URL of selected server */
  label: ReactNode;
  /** above the options */
  title: ReactNode;
  options: ServerOption[];
  value?: string;
  onValueChange: (value: string) => void;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          'group flex min-w-0 shrink items-center gap-1 rounded-lg px-1.5 py-1 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:bg-fd-accent data-popup-open:text-fd-accent-foreground',
          className,
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="size-3 shrink-0 transition-transform duration-200 group-data-popup-open:rotate-180" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
          <Popover.Popup className="flex max-h-(--available-height) w-[min(26rem,calc(100vw-2rem))] origin-(--transform-origin) flex-col overflow-y-auto rounded-xl border bg-fd-popover p-1 text-sm text-fd-popover-foreground shadow-lg transition-[opacity,scale] duration-150 ease-out outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-fd-muted-foreground">
              {title}
            </p>
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    if (!selected) onValueChange(option.value);
                    if (!option.hasVariables) setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-start focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none focus-visible:ring-inset',
                    selected
                      ? 'bg-fd-accent text-fd-accent-foreground'
                      : 'hover:bg-fd-accent/50 hover:text-fd-accent-foreground',
                  )}
                >
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {selected && <Check className="mt-0.5 size-3.5 shrink-0 text-fd-primary" />}
                </button>
              );
            })}
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export interface ServerVariable {
  enum?: string[];
  description?: string;
  examples?: string[];
}

/**
 * Edits the variables of the selected server, they apply once typing stops. Key it by the server.
 */
export function ServerVariables({
  defaultValues,
  variables,
  onChange,
}: {
  defaultValues: Record<string, string>;
  variables: Record<string, ServerVariable>;
  onChange: (values: Record<string, string>) => void;
}) {
  const t = useTranslations({ note: 'playground server select' });
  const stf = useStf({
    defaultValues: () => structuredClone(defaultValues),
  });
  const timerRef = useRef<number>(undefined);
  useListener({
    stf,
    onUpdate() {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(
        () => onChange(stf.dataEngine.getData() as Record<string, string>),
        300,
      );
    },
  });
  // edits not applied yet are of this server, they go away with it
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return (
    <StfProvider value={stf}>
      <div className="mt-1 flex flex-col gap-2.5 border-t px-2.5 pt-2.5 pb-2">
        <p className="text-xs font-medium text-fd-muted-foreground">{t('Variables')}</p>
        {Object.entries(variables).map(([key, variable]) => (
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

function VariableInput({ fieldName, variable }: { fieldName: string; variable: ServerVariable }) {
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
        <SelectTrigger id={id} className="h-8 py-1 font-mono text-[0.8125rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {variable.enum.map((item) => (
            <SelectItem key={item} value={item} className="font-mono text-[0.8125rem]">
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const example = variable.examples?.[0];
  return (
    <input
      id={id}
      value={value ?? ''}
      onChange={(e) => setValue(e.target.value)}
      placeholder={example ?? t('Enter Value')}
      className={cn(
        'h-8 w-full rounded-md border bg-fd-secondary px-2 font-mono text-[0.8125rem] text-fd-secondary-foreground outline-none placeholder:text-fd-muted-foreground focus-visible:ring-2 focus-visible:ring-fd-ring',
        example === undefined && 'placeholder:font-sans',
      )}
    />
  );
}
