'use client';

import { TypeNode } from '@/type-tree/types';
import { FieldSet } from './arg-form';
import { FC, Suspense, useDeferredValue, useRef, useState } from 'react';
import { StfProvider, useDataEngine, useListener, useStf } from '@fumari/stf';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

export function Story({
  argTypes,
  Component,
  defaultValues = {},
}: {
  argTypes: TypeNode;
  Component: FC;
  defaultValues?: Record<string, unknown>;
}) {
  const stf = useStf({
    defaultValues,
  });

  return (
    <StfProvider value={stf}>
      <div className="not-prose p-1 border rounded-md shadow-sm bg-fd-card">
        <StoryComponent Component={Component} />
        <FieldSet
          field={argTypes}
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
