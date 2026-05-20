'use client';

import { cn } from '@/utils/cn';
import { useStf, StfProvider, useDataEngine, useListener } from '@fumari/stf';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './components/select';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { FC, useState, useRef, useDeferredValue, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { FieldSet } from './arg-form';
import { VariantInfo } from '..';
import type { TypeNode } from '@/type-tree/types';
import { useTranslations } from './i18n';

export interface WithControlProps {
  displayName?: string;
  Component: FC;
  presets: (VariantInfo & {
    controls: TypeNode;
    defaultValues?: Record<string, unknown>;
  })[];
}

export function WithControl({ presets, displayName, Component }: WithControlProps) {
  const t = useTranslations();
  const [variant, setVariant] = useState(presets[0].variant);
  const preset = presets.find((preset) => preset.variant === variant);
  const stf = useStf({
    defaultValues: preset?.defaultValues,
  });

  return (
    <StfProvider value={stf}>
      <div className="not-prose flex flex-col gap-1 p-1 border rounded-md shadow-sm bg-fd-card text-fd-card-foreground">
        <div className="flex flex-row items-center gap-2 empty:hidden">
          {displayName && <p className="text-sm font-medium px-1.5">{displayName}</p>}
          {presets.length > 1 && (
            <Select
              value={variant}
              onValueChange={(value) => {
                const preset = presets.find((preset) => preset.variant === value);
                if (preset) {
                  setVariant(value);
                  stf.dataEngine.reset(preset.defaultValues ?? {});
                }
              }}
            >
              <SelectTrigger
                variant="ghost"
                className="w-fit ms-auto text-fd-muted-foreground text-xs font-medium"
              >
                <SelectValue placeholder={t.noVariant}>{preset?.variant}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {presets.map((item) => (
                  <SelectItem key={item.variant} value={item.variant}>
                    <p className="text-xs font-medium">{item.variant}</p>
                    <p className="text-xs text-fd-muted-foreground">{item.description}</p>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <StoryComponent Component={Component} />
        {preset && (
          <FieldSet
            key={variant}
            field={preset.controls}
            fieldName={[]}
            name={t.props}
            className="max-h-[600px] overflow-auto"
          />
        )}
      </div>
    </StfProvider>
  );
}

function StoryComponent({ Component }: { Component: FC }) {
  const t = useTranslations();
  const engine = useDataEngine();
  const timerRef = useRef(0);
  const [args, setArgs] = useState(() => engine.getData());
  const deferredArgs = useDeferredValue(args);
  useListener({
    onUpdate() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setArgs({ ...engine.getData() }), 100);
    },
  });

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="p-3 border rounded-lg bg-fd-card text-fd-card-foreground text-sm">
          <p className="inline-flex items-center gap-2 font-medium mb-2">
            <AlertCircle className="text-fd-error size-4" />
            {t.renderError}
          </p>
          <p className="text-fd-muted-foreground mb-2">{String(error)}</p>
          <button
            className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}
            onClick={() => resetErrorBoundary()}
          >
            {t.reset}
          </button>
        </div>
      )}
    >
      <Suspense>
        <Component {...deferredArgs} key={undefined} />
      </Suspense>
    </ErrorBoundary>
  );
}
