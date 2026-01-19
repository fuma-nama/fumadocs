'use client';

import { TypeNode } from '@/type-tree/types';
import { FieldSet } from './arg-form';
import { FC, Suspense, useDeferredValue, useRef, useState } from 'react';
import { StfProvider, useDataEngine, useListener, useStf } from '@fumari/stf';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { VariantInfo } from '..';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/select';

export function Story({
  presets,
  displayName,
  Component,
}: {
  Component: FC;
  displayName?: string;
  presets: (VariantInfo & {
    controls: TypeNode;
    defaultValues?: Record<string, unknown>;
  })[];
}) {
  const [variant, setVariant] = useState(presets[0].variant);
  const preset = presets.find((preset) => preset.variant === variant);
  const stf = useStf({
    defaultValues: preset?.defaultValues,
  });
  if (!preset) return;

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
                <SelectValue>{preset.variant}</SelectValue>
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
        <FieldSet
          key={variant}
          field={preset.controls}
          fieldName={[]}
          name="Props"
          className="max-h-[600px] overflow-auto"
        />
      </div>
    </StfProvider>
  );
}

function StoryComponent({ Component }: { Component: FC }) {
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
            Encountered error when rendering the component.
          </p>
          <p className="text-fd-muted-foreground mb-2">{String(error)}</p>
          <button
            className={cn(buttonVariants({ variant: 'primary', size: 'sm' }))}
            onClick={() => resetErrorBoundary()}
          >
            Reset
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
