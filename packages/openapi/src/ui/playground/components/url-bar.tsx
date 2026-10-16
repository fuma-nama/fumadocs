'use client';
import { useTranslations } from '@fuma-translate/react';
import { SendHorizontal } from 'lucide-react';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Spinner } from 'shared-api/components/spinner';
import { ParamInput } from 'shared-api/components/playground/param-input';
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
              const param = parameters.find((p) => p.name === name);

              return (
                <ParamInput
                  key={i}
                  fieldName={['path', name]}
                  name={name}
                  schema={param?.schema as JsonSchema | undefined}
                  description={param?.description}
                />
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
