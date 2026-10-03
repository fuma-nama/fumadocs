'use client';
import { useFieldValue } from '@fumari/stf';
import { useTranslations } from '@fuma-translate/react';
import { SendHorizontal } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Spinner } from 'shared-api/components/spinner';
import { useResolvedSchema } from 'shared-api/components/playground/schema';
import type { JsonSchema } from '@fumadocs/json-schema';
import { MethodLabel } from '@/ui/components/method-label';
import type { ParameterObject } from '@/types';
import { cn } from '@/utils/cn';
import ServerSelect from './server-select';

export function UrlBar({
  method,
  route,
  parameters,
  deprecated = false,
  loading,
}: {
  method: string;
  route: string;
  /** path parameters, edited inline */
  parameters: ParameterObject[];
  deprecated?: boolean;
  loading: boolean;
}) {
  const t = useTranslations({ note: 'playground' });
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl border bg-fd-card ps-1 pe-2 text-[0.8125rem]">
        <MethodLabel className="shrink-0 rounded-lg bg-current/10 px-2 py-1 text-xs">
          {method}
        </MethodLabel>
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto font-mono [scrollbar-width:none]">
          <ServerSelect className="min-w-16" />
          <div
            className={cn(
              'flex shrink-0 items-center whitespace-pre text-fd-foreground',
              deprecated && 'line-through',
            )}
          >
            {route.split(/(\{[^}]+\})/).map((part, i) => {
              if (!part.startsWith('{') || !part.endsWith('}')) return part;
              const name = part.slice(1, -1);

              return (
                <PathParam key={i} name={name} param={parameters.find((p) => p.name === name)} />
              );
            })}
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className={cn(
          buttonVariants({ variant: 'primary' }),
          'h-10 shrink-0 gap-2 rounded-xl px-4 transition-[background-color,scale] active:scale-[0.97] disabled:opacity-80 motion-reduce:transition-none',
        )}
      >
        {loading ? <Spinner className="size-3.5" /> : <SendHorizontal className="size-3.5" />}
        {t('Send')}
        <kbd className="hidden font-sans text-xs text-fd-primary-foreground/60 sm:inline">
          {isMac ? '⌘' : 'Ctrl'} ↵
        </kbd>
      </button>
    </div>
  );
}

function PathParam({ name, param }: { name: string; param?: ParameterObject }) {
  const schema = useResolvedSchema((param?.schema ?? true) as JsonSchema);
  const [value, setValue] = useFieldValue(['path', name]);
  const text = value == null ? '' : String(value);
  const className =
    'mx-px rounded-md bg-fd-primary/10 px-1.5 py-0.5 text-fd-primary outline-none transition-colors placeholder:text-fd-primary/50 hover:bg-fd-primary/15 focus-visible:bg-fd-primary/15 focus-visible:ring-2 focus-visible:ring-fd-primary/30';

  if (schema.enum && schema.enum.length > 0) {
    const options = schema.enum;

    return (
      <select
        aria-label={name}
        title={param?.description}
        value={String(options.indexOf(value))}
        onChange={(e) => setValue(options[Number(e.target.value)])}
        className={cn(className, 'cursor-pointer appearance-none')}
      >
        <option value="-1" disabled className="bg-fd-popover text-fd-popover-foreground">
          {name}
        </option>
        {options.map((item, i) => (
          <option key={i} value={i} className="bg-fd-popover text-fd-popover-foreground">
            {String(item)}
          </option>
        ))}
      </select>
    );
  }

  const isNumber = schema.type === 'integer' || schema.type === 'number';
  return (
    <input
      aria-label={name}
      title={param?.description}
      value={text}
      placeholder={name}
      autoComplete="off"
      spellCheck={false}
      inputMode={isNumber ? 'decimal' : undefined}
      onChange={(e) => {
        const v = e.target.value;
        if (v.length === 0) setValue(undefined);
        else setValue(isNumber && !Number.isNaN(Number(v)) ? Number(v) : v);
      }}
      style={{ width: `calc(${Math.max(text.length, name.length, 1)}ch + 0.75rem)` }}
      className={className}
    />
  );
}
